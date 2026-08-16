import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { PqrsfEstado, PqrsfTipo, User } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

interface Ctx {
  actor: User;
  ip?: string | null;
}

/**
 * Plazo legal por tipo, en días HÁBILES.
 *
 * Los valores salen del derecho de petición (Ley 1755 de 2015). Están aquí y
 * no dispersos porque cambian por ley, no por gusto, y hay que poder
 * encontrarlos de un vistazo el día que cambien.
 */
const DIAS_HABILES: Record<PqrsfTipo, number> = {
  PETICION: 15,
  QUEJA: 15,
  RECLAMO: 15,
  SUGERENCIA: 15,
  // Una felicitación no tiene plazo legal, pero dejarla sin fecha la vuelve
  // invisible en los listados ordenados por vencimiento.
  FELICITACION: 30,
};

@Injectable()
export class PqrsfService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Suma días hábiles saltando fines de semana y festivos.
   *
   * Contar días corridos da una fecha que la clínica cree cumplir y no
   * cumple: quince corridos desde el 20 de diciembre caen en plena Semana
   * Santa del calendario colombiano de festivos consecutivos. Los festivos
   * salen de la tabla que ya se siembra calculada, no de una lista aparte.
   */
  private async vencimiento(desde: Date, dias: number): Promise<Date> {
    const festivos = new Set(
      (
        await this.prisma.holiday.findMany({
          where: { date: { gte: desde, lte: new Date(desde.getTime() + 120 * 86_400_000) } },
          select: { date: true },
        })
      ).map((f) => f.date.toISOString().slice(0, 10)),
    );

    const fecha = new Date(desde);
    let restantes = dias;

    while (restantes > 0) {
      fecha.setUTCDate(fecha.getUTCDate() + 1);
      const dow = fecha.getUTCDay();
      const esFinDeSemana = dow === 0 || dow === 6;
      const esFestivo = festivos.has(fecha.toISOString().slice(0, 10));
      if (!esFinDeSemana && !esFestivo) restantes -= 1;
    }

    return fecha;
  }

  /** Radicado consecutivo por año: PQR-2026-0001. */
  private async siguienteRadicado(): Promise<string> {
    const anio = new Date().getUTCFullYear();
    const cuantas = await this.prisma.pqrsf.count({
      where: { radicado: { startsWith: `PQR-${anio}-` } },
    });
    return `PQR-${anio}-${String(cuantas + 1).padStart(4, '0')}`;
  }

  async radicar(
    datos: {
      tipo: PqrsfTipo;
      asunto: string;
      detalle: string;
      personId?: string;
      nombre?: string;
      contacto?: string;
      siteId?: string;
      serviceId?: string;
    },
    ctx: Ctx,
  ) {
    // Quien radica tiene que ser localizable, sea paciente o no: sin
    // contacto no hay a quién responderle y el plazo legal corre igual.
    if (!datos.personId && !datos.contacto) {
      throw new BadRequestException(
        'Indique el paciente o un dato de contacto: hay que poder responder dentro del plazo.',
      );
    }

    const dueDate = await this.vencimiento(new Date(), DIAS_HABILES[datos.tipo]);

    const p = await this.prisma.pqrsf.create({
      data: {
        radicado: await this.siguienteRadicado(),
        tipo: datos.tipo,
        asunto: datos.asunto.trim(),
        detalle: datos.detalle.trim(),
        personId: datos.personId,
        nombre: datos.nombre?.trim(),
        contacto: datos.contacto?.trim(),
        siteId: datos.siteId,
        serviceId: datos.serviceId,
        dueDate,
        createdById: ctx.actor.id,
      },
      select: { id: true, radicado: true, dueDate: true, tipo: true },
    });

    await this.audit.record({
      userId: ctx.actor.id,
      action: 'CREATE',
      entityType: 'pqrsf',
      entityId: p.id,
      personId: datos.personId,
      newValues: { radicado: p.radicado, tipo: p.tipo },
      ipAddress: ctx.ip,
    });

    return p;
  }

  listar(filtro: { estado?: PqrsfEstado; vencidas?: boolean; personId?: string }) {
    return this.prisma.pqrsf.findMany({
      where: {
        ...(filtro.estado ? { estado: filtro.estado } : {}),
        ...(filtro.personId ? { personId: filtro.personId } : {}),
        ...(filtro.vencidas
          ? { dueDate: { lt: new Date() }, estado: { in: ['RADICADA', 'EN_GESTION'] } }
          : {}),
      },
      orderBy: [{ estado: 'asc' }, { dueDate: 'asc' }],
      take: 200,
      select: {
        id: true,
        radicado: true,
        tipo: true,
        estado: true,
        asunto: true,
        detalle: true,
        contacto: true,
        nombre: true,
        dueDate: true,
        respuesta: true,
        respondedAt: true,
        satisfaccion: true,
        createdAt: true,
        person: { select: { id: true, displayName: true, phone: true } },
        site: { select: { code: true } },
        service: { select: { name: true } },
        assignedTo: { select: { firstName: true, lastName: true } },
      },
    });
  }

  async asignar(id: string, userId: string, ctx: Ctx) {
    const p = await this.prisma.pqrsf.update({
      where: { id },
      data: { assignedToId: userId, estado: 'EN_GESTION' },
      select: { id: true, radicado: true, estado: true, personId: true },
    });

    await this.audit.record({
      userId: ctx.actor.id,
      action: 'UPDATE',
      entityType: 'pqrsf',
      entityId: id,
      personId: p.personId,
      newValues: { asignadaA: userId },
      ipAddress: ctx.ip,
    });

    return p;
  }

  async responder(id: string, respuesta: string, ctx: Ctx) {
    const antes = await this.prisma.pqrsf.findUnique({
      where: { id },
      select: { personId: true, dueDate: true, respondedAt: true },
    });
    if (!antes) throw new NotFoundException('Radicado no encontrado');

    // Responder dos veces sobrescribiría la primera respuesta y con ella la
    // prueba de si se cumplió el plazo.
    if (antes.respondedAt) {
      throw new BadRequestException('Ya tiene respuesta. Registre una nueva PQRSF si hay más.');
    }

    const ahora = new Date();
    const p = await this.prisma.pqrsf.update({
      where: { id },
      data: { respuesta: respuesta.trim(), respondedAt: ahora, estado: 'RESPONDIDA' },
      select: { id: true, radicado: true, estado: true, respondedAt: true, dueDate: true },
    });

    await this.audit.record({
      userId: ctx.actor.id,
      action: 'UPDATE',
      entityType: 'pqrsf',
      entityId: id,
      personId: antes.personId,
      newValues: {
        estado: 'RESPONDIDA',
        // Se registra si se cumplió el plazo: es lo que un ente de control
        // pregunta, y calcularlo después sobre fechas sueltas se presta a
        // interpretaciones.
        dentroDePlazo: ahora <= antes.dueDate,
      },
      ipAddress: ctx.ip,
    });

    return { ...p, dentroDePlazo: ahora <= antes.dueDate };
  }

  async cerrar(id: string, satisfaccion: number | undefined, ctx: Ctx) {
    const p = await this.prisma.pqrsf.update({
      where: { id },
      data: { estado: 'CERRADA', closedAt: new Date(), satisfaccion },
      select: { id: true, radicado: true, estado: true, personId: true },
    });

    await this.audit.record({
      userId: ctx.actor.id,
      action: 'UPDATE',
      entityType: 'pqrsf',
      entityId: id,
      personId: p.personId,
      newValues: { estado: 'CERRADA', satisfaccion },
      ipAddress: ctx.ip,
    });

    return p;
  }

  /** Indicadores: es lo que pide una auditoría de calidad. */
  async indicadores() {
    const [porTipo, porEstado, vencidas, respondidas] = await Promise.all([
      this.prisma.pqrsf.groupBy({ by: ['tipo'], _count: true }),
      this.prisma.pqrsf.groupBy({ by: ['estado'], _count: true }),
      this.prisma.pqrsf.count({
        where: { dueDate: { lt: new Date() }, estado: { in: ['RADICADA', 'EN_GESTION'] } },
      }),
      this.prisma.pqrsf.findMany({
        where: { respondedAt: { not: null } },
        select: { respondedAt: true, dueDate: true, satisfaccion: true },
      }),
    ]);

    const aTiempo = respondidas.filter((r) => r.respondedAt! <= r.dueDate).length;
    const calificadas = respondidas.filter((r) => r.satisfaccion != null);

    return {
      porTipo: Object.fromEntries(porTipo.map((p) => [p.tipo, p._count])),
      porEstado: Object.fromEntries(porEstado.map((p) => [p.estado, p._count])),
      vencidasSinResponder: vencidas,
      respondidas: respondidas.length,
      dentroDePlazo: aTiempo,
      cumplimiento: respondidas.length ? Math.round((aTiempo / respondidas.length) * 100) : null,
      satisfaccionMedia: calificadas.length
        ? Number(
            (calificadas.reduce((s, r) => s + r.satisfaccion!, 0) / calificadas.length).toFixed(1),
          )
        : null,
    };
  }
}
