import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, type LeadStatus, type User } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { TimelineService } from '../timeline/timeline.service';

interface Ctx {
  actor: User;
  ip?: string | null;
}

const CERO = new Prisma.Decimal(0);

/**
 * Embudo comercial.
 *
 * El Lead cuelga de Person desde el primer mensaje: no hay "lead suelto que se
 * convierte en paciente" y luego hay que re-parentar conversaciones. Eso ya
 * estaba decidido en el modelo; lo que faltaba era poder trabajarlo.
 *
 * La conversión NO se marca a mano. Un lead está convertido cuando esa persona
 * tiene una cita, y punto: un campo que alguien marca es un campo que se
 * marca de más a fin de mes.
 */
@Injectable()
export class LeadsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly timeline: TimelineService,
  ) {}

  async listar(filtro: { status?: LeadStatus; assignedToId?: string; siteId?: string; sinTocar?: boolean }) {
    const leads = await this.prisma.lead.findMany({
      where: {
        ...(filtro.status ? { status: filtro.status } : {}),
        ...(filtro.assignedToId ? { assignedToId: filtro.assignedToId } : {}),
        ...(filtro.siteId ? { siteId: filtro.siteId } : {}),
        // "Sin tocar" es el único filtro que de verdad se usa: un lead nuevo
        // de hace tres días es un paciente que ya llamó a otra clínica.
        ...(filtro.sinTocar ? { status: 'NUEVO', assignedToId: null } : {}),
      },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      take: 200,
      select: {
        id: true,
        status: true,
        source: true,
        interestText: true,
        quotedAmount: true,
        quotedAt: true,
        lostReason: true,
        convertedAt: true,
        createdAt: true,
        updatedAt: true,
        person: {
          select: {
            id: true,
            displayName: true,
            phone: true,
            // Con esto se calcula la conversión sin creerle a ningún campo.
            appointments: {
              select: { id: true, startsAt: true, status: true },
              orderBy: { startsAt: 'desc' },
              take: 1,
            },
          },
        },
        interestService: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, firstName: true, lastName: true } },
        site: { select: { code: true } },
        conversation: { select: { id: true } },
      },
    });

    const ahora = Date.now();
    return leads.map((l) => ({
      ...l,
      tieneCita: l.person.appointments.length > 0,
      // Horas desde el último movimiento. Es el número que ordena el trabajo
      // del día: lo que lleva más tiempo quieto es lo que se está perdiendo.
      horasSinTocar: Math.floor((ahora - l.updatedAt.getTime()) / 3_600_000),
    }));
  }

  async asignar(id: string, userId: string | null, ctx: Ctx) {
    const l = await this.prisma.lead.update({
      where: { id },
      data: {
        assignedToId: userId,
        // Asignarlo ya es tocarlo: dejarlo en NUEVO haría que siguiera
        // apareciendo en la lista de los que nadie ha mirado.
        ...(userId ? { status: 'CONTACTADO' as const } : {}),
      },
      select: { id: true, status: true, personId: true },
    });

    await this.audit.record({
      userId: ctx.actor.id,
      action: 'UPDATE',
      entityType: 'lead',
      entityId: id,
      personId: l.personId,
      newValues: { asignadoA: userId },
      ipAddress: ctx.ip,
    });

    return l;
  }

  async cotizar(
    id: string,
    datos: { amount: number; serviceId?: string; nota?: string },
    ctx: Ctx,
  ) {
    const l = await this.prisma.lead.update({
      where: { id },
      data: {
        quotedAmount: new Prisma.Decimal(datos.amount),
        quotedAt: new Date(),
        status: 'COTIZADO',
        ...(datos.serviceId ? { interestServiceId: datos.serviceId } : {}),
        ...(datos.nota ? { interestText: datos.nota.trim() } : {}),
      },
      select: { id: true, status: true, quotedAmount: true, personId: true, siteId: true },
    });

    await this.timeline.emitir({
      personId: l.personId,
      type: 'COTIZACION_ENVIADA',
      title: `Cotización por ${datos.amount.toLocaleString('es-CO')}`,
      siteId: l.siteId,
      actorUserId: ctx.actor.id,
      refType: 'lead',
      refId: id,
    });

    await this.audit.record({
      userId: ctx.actor.id,
      action: 'UPDATE',
      entityType: 'lead',
      entityId: id,
      personId: l.personId,
      newValues: { cotizado: datos.amount },
      ipAddress: ctx.ip,
    });

    return l;
  }

  async perder(id: string, motivo: string, ctx: Ctx) {
    const previo = await this.prisma.lead.findUnique({
      where: { id },
      select: { personId: true, siteId: true, convertedAt: true },
    });
    if (!previo) throw new NotFoundException('Lead no encontrado');
    if (previo.convertedAt) {
      throw new BadRequestException('Ese lead ya se convirtió: no se puede marcar como perdido.');
    }

    // El motivo es obligatorio y es el dato con valor: "perdidos: 40" no dice
    // nada; "perdidos por precio: 30 de 40" dice qué hacer.
    const l = await this.prisma.lead.update({
      where: { id },
      data: { status: 'PERDIDO', lostReason: motivo.trim() },
      select: { id: true, status: true, lostReason: true },
    });

    await this.timeline.emitir({
      personId: previo.personId,
      type: 'LEAD_PERDIDO',
      title: `Lead perdido: ${motivo.trim()}`,
      siteId: previo.siteId,
      actorUserId: ctx.actor.id,
      refType: 'lead',
      refId: id,
    });

    return l;
  }

  /**
   * Marca como convertidos los leads cuya persona ya tiene cita.
   *
   * Se deriva en vez de pedir que alguien lo marque, porque un campo que se
   * marca a mano se marca de más justo cuando se mide la comisión. Corre al
   * pedir el embudo: es barato y así el número nunca está viejo.
   */
  private async conciliarConversiones() {
    const abiertos = await this.prisma.lead.findMany({
      where: { convertedAt: null, status: { notIn: ['PERDIDO', 'CONVERTIDO'] } },
      select: { id: true, personId: true, createdAt: true },
    });
    if (!abiertos.length) return 0;

    const conCita = await this.prisma.appointment.findMany({
      where: { personId: { in: abiertos.map((l) => l.personId) } },
      select: { personId: true, createdAt: true },
    });

    const primeraCita = new Map<string, Date>();
    for (const c of conCita) {
      const previa = primeraCita.get(c.personId);
      if (!previa || c.createdAt < previa) primeraCita.set(c.personId, c.createdAt);
    }

    let n = 0;
    for (const l of abiertos) {
      const cita = primeraCita.get(l.personId);
      // La cita tiene que ser POSTERIOR al lead. Si ya era paciente antes de
      // escribir, esa cita no la trajo esta conversación.
      if (!cita || cita < l.createdAt) continue;
      await this.prisma.lead.update({
        where: { id: l.id },
        data: { status: 'CONVERTIDO', convertedAt: cita },
      });
      n += 1;
    }
    return n;
  }

  async embudo(desde?: Date, hasta?: Date) {
    const conciliados = await this.conciliarConversiones();

    const rango = {
      ...(desde || hasta
        ? { createdAt: { ...(desde ? { gte: desde } : {}), ...(hasta ? { lte: hasta } : {}) } }
        : {}),
    };

    const [porEstado, porOrigen, perdidos, convertidos, sinTocar] = await Promise.all([
      this.prisma.lead.groupBy({ by: ['status'], where: rango, _count: true }),
      this.prisma.lead.groupBy({ by: ['source'], where: rango, _count: true }),
      this.prisma.lead.findMany({
        where: { ...rango, status: 'PERDIDO' },
        select: { lostReason: true },
      }),
      this.prisma.lead.findMany({
        where: { ...rango, convertedAt: { not: null } },
        select: { createdAt: true, convertedAt: true, quotedAmount: true },
      }),
      this.prisma.lead.count({ where: { status: 'NUEVO', assignedToId: null } }),
    ]);

    const total = porEstado.reduce((s, p) => s + p._count, 0);

    // Días entre el primer contacto y la cita. Un embudo que convierte al
    // 30% en dos días vale más que uno que convierte al 35% en dos semanas.
    const dias = convertidos
      .filter((c) => c.convertedAt)
      .map((c) => (c.convertedAt!.getTime() - c.createdAt.getTime()) / 86_400_000);

    const motivos = new Map<string, number>();
    for (const p of perdidos) {
      const m = (p.lostReason ?? 'sin motivo').trim().toLowerCase();
      motivos.set(m, (motivos.get(m) ?? 0) + 1);
    }

    return {
      total,
      porEstado: Object.fromEntries(porEstado.map((p) => [p.status, p._count])),
      porOrigen: Object.fromEntries(porOrigen.map((p) => [p.source, p._count])),
      convertidos: convertidos.length,
      tasaConversion: total ? Number(((convertidos.length / total) * 100).toFixed(1)) : null,
      diasHastaConvertir: dias.length ? Number((dias.reduce((a, b) => a + b, 0) / dias.length).toFixed(1)) : null,
      valorCotizado: convertidos.reduce((s, c) => s.plus(c.quotedAmount ?? CERO), CERO).toFixed(2),
      // El único número que exige actuar hoy.
      sinTocar,
      // Ordenados: el primero es en lo que hay que trabajar.
      motivosDePerdida: [...motivos.entries()]
        .map(([motivo, veces]) => ({ motivo, veces }))
        .sort((a, b) => b.veces - a.veces),
      conciliadosAhora: conciliados,
    };
  }
}
