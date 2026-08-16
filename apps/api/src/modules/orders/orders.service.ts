import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Laterality, ServiceOrderStatus, User } from '@prisma/client';
import { createHash } from 'node:crypto';

import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { TimelineService } from '../timeline/timeline.service';

interface Ctx {
  actor: User;
  ip?: string | null;
}

/**
 * Órdenes de servicio: "al paciente le mandaron un OCT".
 *
 * La orden existe aunque nadie la agende todavía, y ese es justo su valor:
 * la lista de órdenes pendientes es la de pacientes que se quedaron a mitad
 * de camino. Sin ella, un examen ordenado y nunca hecho no aparece en
 * ningún sitio — no hay cita, no hay resultado, no hay nada que consultar.
 */
@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly timeline: TimelineService,
  ) {}

  async crear(
    datos: {
      personId: string;
      serviceId: string;
      laterality?: Laterality;
      originAppointmentId?: string;
      orderedByProfessionalId?: string;
      indications?: string;
      /** Orden de otra IPS ya escaneada. */
      externalOrderUrl?: string;
      /** Días de vigencia. Vencida, la EPS suele no autorizarla. */
      vigenciaDias?: number;
    },
    ctx: Ctx,
  ) {
    const servicio = await this.prisma.service.findUnique({
      where: { id: datos.serviceId },
      select: { name: true, requiresAuthorization: true, isBilateral: true },
    });
    if (!servicio) throw new NotFoundException('Servicio no encontrado');

    const orden = await this.prisma.$transaction(async (tx) => {
      const o = await tx.serviceOrder.create({
        data: {
          personId: datos.personId,
          serviceId: datos.serviceId,
          laterality: datos.laterality ?? (servicio.isBilateral ? 'AO' : 'NA'),
          originAppointmentId: datos.originAppointmentId,
          orderedByProfessionalId: datos.orderedByProfessionalId,
          indications: datos.indications,
          externalOrderUrl: datos.externalOrderUrl,
          // Sin autorización requerida, nace lista para agendar.
          status: servicio.requiresAuthorization ? 'PENDIENTE' : 'AUTORIZADA',
          dueDate: datos.vigenciaDias
            ? new Date(Date.now() + datos.vigenciaDias * 86_400_000)
            : null,
          createdById: ctx.actor.id,
        },
        select: { id: true, status: true },
      });

      await this.timeline.emitir(
        {
          personId: datos.personId,
          type: 'ORDEN_GENERADA',
          title: `Le ordenaron ${servicio.name}`,
          actorUserId: ctx.actor.id,
          refType: 'service_order',
          refId: o.id,
        },
        tx,
      );

      return o;
    });

    await this.audit.record({
      userId: ctx.actor.id,
      action: 'CREATE',
      entityType: 'service_order',
      entityId: orden.id,
      personId: datos.personId,
      newValues: { servicio: servicio.name },
      ipAddress: ctx.ip,
    });

    return orden;
  }

  /**
   * Lo que quedó a medias. Es la consulta que da valor a todo el módulo:
   * quién tiene un examen ordenado y no agendado, o hecho y sin resultado
   * entregado.
   */
  listar(filtro: { estado?: ServiceOrderStatus; personId?: string; vencidas?: boolean }) {
    return this.prisma.serviceOrder.findMany({
      where: {
        ...(filtro.estado ? { status: filtro.estado } : {}),
        ...(filtro.personId ? { personId: filtro.personId } : {}),
        ...(filtro.vencidas
          ? { dueDate: { lt: new Date() }, status: { in: ['PENDIENTE', 'AUTORIZADA'] } }
          : {}),
      },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      take: 200,
      select: {
        id: true,
        status: true,
        laterality: true,
        indications: true,
        authorizationNumber: true,
        dueDate: true,
        createdAt: true,
        person: { select: { id: true, displayName: true, phone: true } },
        service: {
          select: { name: true, businessLine: true, requiresAuthorization: true, preparationNotes: true },
        },
        orderedBy: { select: { displayName: true } },
        scheduledAppointments: {
          orderBy: { startsAt: 'desc' },
          take: 1,
          select: { id: true, publicCode: true, startsAt: true, status: true },
        },
        results: {
          orderBy: { performedAt: 'desc' },
          select: { id: true, fileName: true, isFinal: true, performedAt: true },
        },
      },
    });
  }

  async autorizar(id: string, numero: string, ctx: Ctx) {
    const o = await this.prisma.serviceOrder.update({
      where: { id },
      data: { status: 'AUTORIZADA', authorizationNumber: numero, authorizedAt: new Date() },
      select: { id: true, status: true, personId: true },
    });

    await this.audit.record({
      userId: ctx.actor.id,
      action: 'UPDATE',
      entityType: 'service_order',
      entityId: id,
      personId: o.personId,
      newValues: { autorizacion: numero },
      ipAddress: ctx.ip,
    });

    return o;
  }

  /**
   * Adjunta el resultado.
   *
   * Guarda el SHA-256 del archivo. Es barato ahora e imposible después: sin
   * él, no hay forma de demostrar que el informe que se descarga hoy es el
   * mismo que se subió, y un resultado diagnóstico alterado es un problema
   * clínico, no informático.
   *
   * `isFinal` distingue un informe preliminar de uno definitivo: entregar un
   * preliminar como definitivo es peor que no entregar nada.
   */
  async adjuntarResultado(
    id: string,
    datos: {
      fileUrl: string;
      fileName: string;
      mimeType: string;
      sizeBytes: number;
      /** Contenido en base64 SOLO para calcular el hash; no se almacena. */
      contenidoBase64?: string;
      sha256?: string;
      reportText?: string;
      performedById?: string;
      equipmentId?: string;
      isFinal?: boolean;
    },
    ctx: Ctx,
  ) {
    const orden = await this.prisma.serviceOrder.findUnique({
      where: { id },
      select: { id: true, personId: true, service: { select: { name: true } } },
    });
    if (!orden) throw new NotFoundException('Orden no encontrada');

    const sha256 =
      datos.sha256 ??
      (datos.contenidoBase64
        ? createHash('sha256').update(Buffer.from(datos.contenidoBase64, 'base64')).digest('hex')
        : null);

    if (!sha256) {
      throw new BadRequestException(
        'Falta el hash del archivo. Sin él no se puede demostrar que el resultado no cambió.',
      );
    }

    const resultado = await this.prisma.$transaction(async (tx) => {
      const r = await tx.serviceResult.create({
        data: {
          serviceOrderId: id,
          fileUrl: datos.fileUrl,
          fileName: datos.fileName,
          mimeType: datos.mimeType,
          sizeBytes: datos.sizeBytes,
          sha256,
          reportText: datos.reportText,
          performedById: datos.performedById,
          performedAt: new Date(),
          isFinal: datos.isFinal ?? false,
          uploadedById: ctx.actor.id,
        },
        select: { id: true, isFinal: true },
      });

      // La orden pasa a REALIZADA con el primero, y a INFORMADA cuando llega
      // el definitivo: son estados distintos porque el paciente puede
      // preguntar por su resultado entre uno y otro.
      await tx.serviceOrder.update({
        where: { id },
        data: { status: datos.isFinal ? 'INFORMADA' : 'REALIZADA' },
      });

      await this.timeline.emitir(
        {
          personId: orden.personId,
          type: 'RESULTADO_CARGADO',
          title: `Resultado de ${orden.service.name}${datos.isFinal ? '' : ' (preliminar)'}`,
          actorUserId: ctx.actor.id,
          refType: 'service_result',
          refId: r.id,
        },
        tx,
      );

      return r;
    });

    await this.audit.record({
      userId: ctx.actor.id,
      action: 'CREATE',
      entityType: 'service_result',
      entityId: resultado.id,
      personId: orden.personId,
      newValues: { archivo: datos.fileName, definitivo: resultado.isFinal, sha256 },
      ipAddress: ctx.ip,
    });

    return resultado;
  }

  /**
   * Descargar un resultado es acceder a un dato clínico: queda auditado con
   * quién y desde dónde.
   */
  async verResultado(id: string, ctx: Ctx) {
    const r = await this.prisma.serviceResult.findUnique({
      where: { id },
      select: {
        id: true,
        fileUrl: true,
        fileName: true,
        mimeType: true,
        sha256: true,
        reportText: true,
        performedAt: true,
        isFinal: true,
        serviceOrder: { select: { personId: true, service: { select: { name: true } } } },
      },
    });
    if (!r) throw new NotFoundException('Resultado no encontrado');

    await this.audit.record({
      userId: ctx.actor.id,
      action: 'READ',
      entityType: 'service_result',
      entityId: id,
      personId: r.serviceOrder?.personId,
      ipAddress: ctx.ip,
    });

    return r;
  }

  async anular(id: string, motivo: string, ctx: Ctx) {
    const o = await this.prisma.serviceOrder.findUnique({
      where: { id },
      select: { personId: true, results: { select: { id: true } } },
    });
    if (!o) throw new NotFoundException('Orden no encontrada');

    // Una orden con resultado ya no se anula: el examen se hizo y el
    // resultado existe. Anularla dejaría un resultado colgando de una orden
    // que dice que nunca ocurrió.
    if (o.results.length) {
      throw new BadRequestException(
        'Esta orden ya tiene resultado: el examen se realizó y no puede anularse.',
      );
    }

    const anulada = await this.prisma.serviceOrder.update({
      where: { id },
      data: { status: 'ANULADA', indications: motivo },
      select: { id: true, status: true },
    });

    await this.audit.record({
      userId: ctx.actor.id,
      action: 'UPDATE',
      entityType: 'service_order',
      entityId: id,
      personId: o.personId,
      newValues: { estado: 'ANULADA', motivo },
      ipAddress: ctx.ip,
    });

    return anulada;
  }

  /** Cifras para el tablero: dónde se está quedando gente por el camino. */
  async pendientes() {
    const [porEstado, vencidas, sinResultado] = await Promise.all([
      this.prisma.serviceOrder.groupBy({ by: ['status'], _count: true }),
      this.prisma.serviceOrder.count({
        where: { dueDate: { lt: new Date() }, status: { in: ['PENDIENTE', 'AUTORIZADA'] } },
      }),
      // Realizadas hace más de tres días y sin informe definitivo: el
      // paciente ya vino, hizo el examen, y sigue esperando.
      this.prisma.serviceOrder.count({
        where: { status: 'REALIZADA', updatedAt: { lt: new Date(Date.now() - 3 * 86_400_000) } },
      }),
    ]);

    return {
      porEstado: Object.fromEntries(porEstado.map((p) => [p.status, p._count])),
      vencidas,
      realizadasSinInforme: sinResultado,
    };
  }
}
