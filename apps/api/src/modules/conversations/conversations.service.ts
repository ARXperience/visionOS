import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { ConversationStatus, User } from '@prisma/client';
import { randomUUID } from 'node:crypto';

import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

/** El gateway escucha solo en localhost; nunca se expone por Caddy. */
const GATEWAY = process.env.GATEWAY_URL ?? 'http://127.0.0.1:3002';

interface Contexto {
  user: User | null;
  ip?: string | null;
  userAgent?: string | null;
}

@Injectable()
export class ConversationsService {
  private readonly logger = new Logger(ConversationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Las sedes que el usuario puede ver. `null` = todas.
   *
   * A diferencia del paciente —que es global y se busca desde cualquier
   * sede—, la bandeja sí se acota: una recepcionista de Ibagué no tiene por
   * qué leer las conversaciones de Bogotá.
   */
  private async sedesDe(user: User): Promise<string[] | null> {
    if (user.crossSitePatientRead || user.role === 'SUPERADMIN') return null;
    const acceso = await this.prisma.userSiteAccess.findMany({
      where: { userId: user.id },
      select: { siteId: true },
    });
    return acceso.map((a) => a.siteId);
  }

  async listar(user: User, filtro: { estado?: ConversationStatus; sinLeer?: boolean }) {
    const sedes = await this.sedesDe(user);

    return this.prisma.conversation.findMany({
      where: {
        deletedAt: null,
        ...(filtro.estado ? { status: filtro.estado } : {}),
        ...(filtro.sinLeer ? { unreadCount: { gt: 0 } } : {}),
        // Las conversaciones sin sede asignada (línea central) las ve todo
        // el mundo: son justamente las que aún no se han repartido.
        ...(sedes ? { OR: [{ siteId: { in: sedes } }, { siteId: null }] } : {}),
      },
      orderBy: [{ lastMessageAt: 'desc' }, { createdAt: 'desc' }],
      take: 100,
      select: {
        id: true,
        contactName: true,
        phoneNumber: true,
        status: true,
        aiEnabled: true,
        unreadCount: true,
        lastMessageAt: true,
        lastMessageText: true,
        tags: true,
        person: { select: { id: true, displayName: true, isPatient: true } },
        assignedTo: { select: { id: true, firstName: true, lastName: true } },
        site: { select: { id: true, code: true } },
      },
    });
  }

  /**
   * Abrir una conversación es leer datos de una persona, así que queda
   * auditado. La Ley 1581 obliga a poder responder quién consultó a quién,
   * y un chat de WhatsApp con un paciente es dato de salud tanto como una
   * ficha.
   */
  async detalle(id: string, ctx: Contexto) {
    const conv = await this.prisma.conversation.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        contactName: true,
        phoneNumber: true,
        status: true,
        aiEnabled: true,
        externalId: true,
        channelId: true,
        siteId: true,
        tags: true,
        person: {
          select: { id: true, displayName: true, isPatient: true, docNumber: true, phone: true },
        },
        assignedTo: { select: { id: true, firstName: true, lastName: true } },
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 200,
          select: {
            id: true,
            direction: true,
            author: true,
            type: true,
            status: true,
            body: true,
            isInternal: true,
            createdAt: true,
            sentAt: true,
            error: true,
            sentBy: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });

    if (!conv) throw new NotFoundException('Conversación no encontrada');

    if (conv.person) {
      await this.audit.readOf(conv.person.id, {
        userId: ctx.user?.id ?? null,
        siteId: conv.siteId,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
      });
    }

    return conv;
  }

  /**
   * Envía por WhatsApp, o guarda una nota interna que el paciente no ve.
   *
   * El mensaje se guarda ANTES de enviarlo, en PENDIENTE. Si el gateway
   * falla, queda registrado como FALLIDO con su motivo en vez de
   * desaparecer: el agente ve que no salió y puede reintentar. Al revés
   * —enviar primero y guardar después— un fallo al guardar produce un
   * mensaje que el paciente recibió y que en el panel no existe.
   */
  async enviar(id: string, texto: string, ctx: Contexto, interno = false) {
    const conv = await this.prisma.conversation.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, channelId: true, externalId: true },
    });
    if (!conv) throw new NotFoundException('Conversación no encontrada');

    const mensaje = await this.prisma.message.create({
      data: {
        conversationId: conv.id,
        direction: 'SALIENTE',
        author: 'AGENTE',
        type: 'TEXT',
        status: interno ? 'ENVIADO' : 'PENDIENTE',
        body: texto,
        isInternal: interno,
        sentById: ctx.user?.id ?? null,
        idempotencyKey: randomUUID(),
        ...(interno ? { sentAt: new Date() } : {}),
      },
    });

    if (interno) return mensaje;

    try {
      const r = await fetch(`${GATEWAY}/canales/${conv.channelId}/enviar`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ a: conv.externalId, texto }),
        signal: AbortSignal.timeout(20_000),
      });

      if (!r.ok) throw new Error(`gateway ${r.status}: ${await r.text()}`);
      const { externalId } = (await r.json()) as { externalId: string };

      const enviado = await this.prisma.message.update({
        where: { id: mensaje.id },
        data: { status: 'ENVIADO', externalId, sentAt: new Date() },
      });

      await this.prisma.conversation.update({
        where: { id: conv.id },
        data: { lastMessageAt: new Date(), lastMessageText: texto.slice(0, 200) },
      });

      return enviado;
    } catch (e) {
      const motivo = (e as Error).message;
      this.logger.error(`No se pudo enviar el mensaje ${mensaje.id}: ${motivo}`);
      return this.prisma.message.update({
        where: { id: mensaje.id },
        data: { status: 'FALLIDO', failedAt: new Date(), error: motivo.slice(0, 500) },
      });
    }
  }

  /**
   * Mensaje enviado por el sistema, no por una persona: recordatorios y
   * confirmaciones. Reusa `enviar` para no duplicar el manejo de fallos,
   * pero queda marcado como SISTEMA en el chat, que es lo honesto.
   */
  async enviarSistema(conversationId: string, texto: string) {
    const m = await this.enviar(conversationId, texto, { user: null }, false);
    return this.prisma.message.update({
      where: { id: m.id },
      data: { author: 'SISTEMA', sentById: null },
    });
  }

  marcarLeida(id: string) {
    return this.prisma.conversation.update({
      where: { id },
      data: { unreadCount: 0 },
      select: { id: true, unreadCount: true },
    });
  }

  asignar(id: string, userId: string | null) {
    return this.prisma.conversation.update({
      where: { id },
      data: { assignedToId: userId, status: userId ? 'ABIERTA' : undefined },
      select: { id: true, assignedTo: { select: { firstName: true, lastName: true } } },
    });
  }

  /**
   * Pausar o reanudar el asistente en esta conversación.
   *
   * Es la palanca que el plan llama handoff: cuando un agente entra a
   * atender, la IA se calla. Sin esto, paciente y asistente se pisan y el
   * paciente recibe dos respuestas distintas al mismo tiempo.
   */
  ia(id: string, activa: boolean) {
    return this.prisma.conversation.update({
      where: { id },
      data: { aiEnabled: activa, aiPausedUntil: null },
      select: { id: true, aiEnabled: true },
    });
  }

  cerrar(id: string, cerrada: boolean) {
    return this.prisma.conversation.update({
      where: { id },
      data: { status: cerrada ? 'CERRADA' : 'ABIERTA' },
      select: { id: true, status: true },
    });
  }
}
