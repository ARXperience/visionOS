import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { User } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

interface Ctx {
  actor: User;
  ip?: string | null;
}

/**
 * Seguimiento: lista de espera y controles pendientes.
 *
 * El motor de recordatorios ya corre solo (T-24 h, T-2 h, no-show) y su salud
 * se ve en Automatizaciones. Lo que faltaba es lo que ningún automatismo
 * resuelve: los pacientes que se quedaron a mitad de camino.
 *
 * Los "controles pendientes" no son una tabla nueva. Se derivan: quien fue
 * atendido hace más de N meses y no tiene ninguna cita futura. Guardar un
 * campo "debe volver el…" obligaría a mantenerlo al día en cada reagenda y
 * cada cancelación, y el día que se desincronice nadie lo notará.
 */
@Injectable()
export class FollowupService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // ── Lista de espera ─────────────────────────────────────────────────

  async anotar(
    datos: {
      personId: string;
      siteId: string;
      serviceId: string;
      professionalId?: string;
      preferredFrom?: Date;
      preferredTo?: Date;
      priority?: number;
      notes?: string;
    },
    ctx: Ctx,
  ) {
    const yaEsta = await this.prisma.waitlistEntry.findFirst({
      where: {
        personId: datos.personId,
        serviceId: datos.serviceId,
        siteId: datos.siteId,
        isActive: true,
      },
      select: { id: true },
    });
    // Anotar dos veces al mismo paciente para el mismo servicio hace que se le
    // ofrezca el mismo cupo dos veces y que aparezca dos veces en la cola.
    if (yaEsta) throw new BadRequestException('Ese paciente ya está en la lista para ese servicio.');

    const e = await this.prisma.waitlistEntry.create({
      data: { ...datos, priority: datos.priority ?? 0, notes: datos.notes?.trim() },
      select: { id: true, priority: true, createdAt: true },
    });

    await this.audit.record({
      userId: ctx.actor.id,
      action: 'CREATE',
      entityType: 'waitlist_entry',
      entityId: e.id,
      personId: datos.personId,
      siteId: datos.siteId,
      ipAddress: ctx.ip,
    });

    return e;
  }

  /**
   * La cola, en el orden en que hay que llamar: primero la prioridad, luego
   * quien lleva más tiempo esperando. El orden es del índice de la base, no
   * de un `sort` en memoria que alguien pueda cambiar sin darse cuenta.
   */
  async espera(filtro: { siteId?: string; serviceId?: string }) {
    const entradas = await this.prisma.waitlistEntry.findMany({
      where: {
        isActive: true,
        ...(filtro.siteId ? { siteId: filtro.siteId } : {}),
        ...(filtro.serviceId ? { serviceId: filtro.serviceId } : {}),
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
      take: 200,
      select: {
        id: true,
        priority: true,
        preferredFrom: true,
        preferredTo: true,
        notifiedAt: true,
        notes: true,
        createdAt: true,
        person: { select: { id: true, displayName: true, phone: true } },
        service: { select: { id: true, name: true } },
        site: { select: { code: true } },
      },
    });

    const ahora = Date.now();
    return entradas.map((e) => ({
      ...e,
      diasEsperando: Math.floor((ahora - e.createdAt.getTime()) / 86_400_000),
    }));
  }

  async marcarOfrecido(id: string, ctx: Ctx) {
    const e = await this.prisma.waitlistEntry.update({
      where: { id },
      data: { notifiedAt: new Date() },
      select: { id: true, notifiedAt: true, personId: true },
    });

    await this.audit.record({
      userId: ctx.actor.id,
      action: 'UPDATE',
      entityType: 'waitlist_entry',
      entityId: id,
      personId: e.personId,
      newValues: { ofrecido: true },
      ipAddress: ctx.ip,
    });

    return e;
  }

  async retirar(id: string, motivo: string | undefined, ctx: Ctx) {
    const previa = await this.prisma.waitlistEntry.findUnique({
      where: { id },
      select: { personId: true, notes: true },
    });
    if (!previa) throw new NotFoundException('Entrada no encontrada');

    // Baja lógica: la lista de espera es la prueba de cuánta demanda no se
    // pudo atender, y borrarla borra esa prueba.
    const e = await this.prisma.waitlistEntry.update({
      where: { id },
      data: {
        isActive: false,
        notes: motivo ? `${previa.notes ?? ''}\nRetirado: ${motivo.trim()}`.trim() : previa.notes,
      },
      select: { id: true, isActive: true },
    });

    await this.audit.record({
      userId: ctx.actor.id,
      action: 'UPDATE',
      entityType: 'waitlist_entry',
      entityId: id,
      personId: previa.personId,
      newValues: { retirado: motivo ?? true },
      ipAddress: ctx.ip,
    });

    return e;
  }

  // ── Controles pendientes ────────────────────────────────────────────

  /**
   * Pacientes que fueron atendidos y no volvieron.
   *
   * `meses` es el intervalo a partir del cual se considera que debían haber
   * vuelto. Es un parámetro y no una constante porque no es lo mismo un
   * control de glaucoma que unas gafas: la clínica decide, y mientras no lo
   * decida, doce meses es el valor que usa cualquier oftalmología.
   */
  async controlesPendientes(meses = 12, siteId?: string) {
    const corte = new Date();
    corte.setUTCMonth(corte.getUTCMonth() - meses);
    const ahora = new Date();

    // Quien tenga CUALQUIER cita futura ya está resuelto: no hay que llamarlo.
    const conCitaFutura = await this.prisma.appointment.findMany({
      where: { startsAt: { gte: ahora }, status: { notIn: ['CANCELADA', 'NO_ASISTIO'] } },
      select: { personId: true },
    });
    const resueltos = new Set(conCitaFutura.map((c) => c.personId));

    const atendidas = await this.prisma.appointment.findMany({
      where: {
        status: 'FINALIZADA',
        startsAt: { lte: corte },
        ...(siteId ? { siteId } : {}),
      },
      orderBy: { startsAt: 'desc' },
      select: {
        personId: true,
        startsAt: true,
        service: { select: { name: true, businessLine: true } },
        site: { select: { code: true } },
        person: { select: { id: true, displayName: true, phone: true, deletedAt: true } },
      },
    });

    // Solo la última atención de cada persona: alguien con ocho citas viejas
    // es un paciente, no ocho pendientes.
    const ultima = new Map<string, (typeof atendidas)[number]>();
    for (const a of atendidas) {
      if (!ultima.has(a.personId)) ultima.set(a.personId, a);
    }

    return [...ultima.values()]
      .filter((a) => !resueltos.has(a.personId) && !a.person.deletedAt)
      .map((a) => ({
        personId: a.person.id,
        paciente: a.person.displayName,
        telefono: a.person.phone,
        ultimaAtencion: a.startsAt.toISOString().slice(0, 10),
        mesesSinVolver: Math.floor((ahora.getTime() - a.startsAt.getTime()) / (30 * 86_400_000)),
        servicio: a.service.name,
        linea: a.service.businessLine,
        sede: a.site.code,
      }))
      .sort((a, b) => b.mesesSinVolver - a.mesesSinVolver)
      .slice(0, 300);
  }

  /** Los tres números del día. */
  async resumen(siteId?: string) {
    const [enEspera, ofrecidosSinRespuesta, pendientes] = await Promise.all([
      this.prisma.waitlistEntry.count({ where: { isActive: true, ...(siteId ? { siteId } : {}) } }),
      this.prisma.waitlistEntry.count({
        where: { isActive: true, notifiedAt: { not: null }, ...(siteId ? { siteId } : {}) },
      }),
      this.controlesPendientes(12, siteId),
    ]);

    return {
      enEspera,
      ofrecidosSinRespuesta,
      controlesPendientes: pendientes.length,
    };
  }
}
