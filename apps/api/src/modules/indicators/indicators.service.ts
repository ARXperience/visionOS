import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

const CERO = new Prisma.Decimal(0);

/**
 * Indicadores de la operación.
 *
 * Deliberadamente NO es una herramienta de BI. El plan dice que para eso va
 * Metabase contra la misma base, con cero código; construir un constructor de
 * reportes sería mantener un producto entero durante años para que alguien
 * arrastre columnas.
 *
 * Esto es la docena de números que la clínica tiene que mirar cada mes y que
 * nadie va a construir en Metabase porque exigen conocer las reglas del
 * negocio: qué cuenta como oportunidad, cuándo un no-show es no-show, qué
 * significa "dentro de plazo" en una PQRSF.
 */
@Injectable()
export class IndicatorsService {
  constructor(private readonly prisma: PrismaService) {}

  async mensual(desde: Date, hasta: Date, siteId?: string) {
    const sede = siteId ? { siteId } : {};

    const [citas, estados, ordenes, cirugias, pqrsf, facturas, optica, conversaciones] =
      await Promise.all([
        this.prisma.appointment.findMany({
          where: { ...sede, startsAt: { gte: desde, lte: hasta } },
          select: { id: true, status: true, startsAt: true, createdAt: true, serviceId: true },
        }),
        this.prisma.appointmentStatusEvent.findMany({
          where: { appointment: { ...sede, startsAt: { gte: desde, lte: hasta } } },
          select: { appointmentId: true, toStatus: true, occurredAt: true },
          orderBy: { occurredAt: 'asc' },
        }),
        this.prisma.serviceOrder.count({ where: { createdAt: { gte: desde, lte: hasta } } }),
        this.prisma.surgery.findMany({
          where: { ...sede, endedAt: { gte: desde, lte: hasta } },
          select: { complications: true, pauseAt: true },
        }),
        this.prisma.pqrsf.findMany({
          where: { createdAt: { gte: desde, lte: hasta } },
          select: { tipo: true, respondedAt: true, dueDate: true, satisfaccion: true },
        }),
        this.prisma.invoice.findMany({
          where: { ...sede, issuedAt: { gte: desde, lte: hasta }, status: { not: 'ANULADA' } },
          select: { total: true, payments: { select: { amount: true } } },
        }),
        this.prisma.opticalOrder.findMany({
          where: { ...sede, createdAt: { gte: desde, lte: hasta } },
          select: { status: true, promisedAt: true, deliveredAt: true },
        }),
        this.prisma.conversation.count({ where: { createdAt: { gte: desde, lte: hasta } } }),
      ]);

    // ── Agenda ────────────────────────────────────────────────────────
    const atendidas = citas.filter((c) => c.status === 'FINALIZADA').length;
    const noShow = citas.filter((c) => c.status === 'NO_ASISTIO').length;
    const canceladas = citas.filter((c) => c.status === 'CANCELADA').length;
    // El denominador son las citas que llegaron a su fecha, no todas: incluir
    // las canceladas con semanas de antelación infla el cumplimiento.
    const efectivas = atendidas + noShow;

    /**
     * Oportunidad: días entre que se pidió la cita y el día en que se dio.
     * Es EL indicador que mira la Supersalud, y el que un paciente llama
     * "cuánto me hicieron esperar para que me dieran cita".
     */
    const esperas = citas.map((c) => Math.max(0, Math.round((c.startsAt.getTime() - c.createdAt.getTime()) / 86_400_000)));
    const oportunidad = esperas.length
      ? Number((esperas.reduce((a, b) => a + b, 0) / esperas.length).toFixed(1))
      : null;

    // Tiempo de espera en sala: de que llegó a que entró.
    const llegada = new Map<string, Date>();
    const esperasEnSala: number[] = [];
    for (const e of estados) {
      if (e.toStatus === 'LLEGO') llegada.set(e.appointmentId, e.occurredAt);
      if (e.toStatus === 'EN_ATENCION') {
        const l = llegada.get(e.appointmentId);
        if (l) esperasEnSala.push(Math.round((e.occurredAt.getTime() - l.getTime()) / 60_000));
      }
    }
    const esperaSala = esperasEnSala.length
      ? Math.round(esperasEnSala.reduce((a, b) => a + b, 0) / esperasEnSala.length)
      : null;

    // ── Dinero ────────────────────────────────────────────────────────
    const facturado = facturas.reduce((s, f) => s.plus(f.total), CERO);
    const recaudado = facturas.reduce(
      (s, f) => s.plus(f.payments.reduce((p, x) => p.plus(x.amount), CERO)),
      CERO,
    );

    // ── PQRSF ─────────────────────────────────────────────────────────
    const respondidas = pqrsf.filter((p) => p.respondedAt);
    const aTiempo = respondidas.filter((p) => p.respondedAt! <= p.dueDate).length;
    const calificadas = pqrsf.filter((p) => p.satisfaccion != null);

    // ── Óptica ────────────────────────────────────────────────────────
    const entregadas = optica.filter((o) => o.deliveredAt);
    const aTiempoOptica = entregadas.filter(
      (o) => !o.promisedAt || o.deliveredAt! <= o.promisedAt,
    ).length;

    const pct = (parte: number, total: number) => (total ? Number(((parte / total) * 100).toFixed(1)) : null);

    return {
      periodo: { desde: desde.toISOString().slice(0, 10), hasta: hasta.toISOString().slice(0, 10) },
      agenda: {
        programadas: citas.length,
        atendidas,
        noShow,
        canceladas,
        tasaNoShow: pct(noShow, efectivas),
        // Días promedio entre la solicitud y la cita.
        oportunidadDias: oportunidad,
        esperaEnSalaMin: esperaSala,
      },
      clinico: {
        ordenesGeneradas: ordenes,
        cirugias: cirugias.length,
        conComplicacion: cirugias.filter((c) => c.complications).length,
        // Si esto no es 100%, hay cirugías que se hicieron sin pausa
        // quirúrgica registrada y eso es un hallazgo, no una estadística.
        conPausaRegistrada: pct(cirugias.filter((c) => c.pauseAt).length, cirugias.length),
      },
      dinero: {
        facturado: facturado.toFixed(2),
        recaudado: recaudado.toFixed(2),
        porRecaudar: facturado.minus(recaudado).toFixed(2),
        tasaRecaudo: facturado.isZero()
          ? null
          : Number(recaudado.div(facturado).mul(100).toFixed(1)),
      },
      experiencia: {
        pqrsf: pqrsf.length,
        quejasYReclamos: pqrsf.filter((p) => p.tipo === 'QUEJA' || p.tipo === 'RECLAMO').length,
        felicitaciones: pqrsf.filter((p) => p.tipo === 'FELICITACION').length,
        cumplimientoPlazo: pct(aTiempo, respondidas.length),
        satisfaccionMedia: calificadas.length
          ? Number(
              (calificadas.reduce((s, p) => s + p.satisfaccion!, 0) / calificadas.length).toFixed(1),
            )
          : null,
      },
      optica: {
        ordenes: optica.length,
        entregadas: entregadas.length,
        entregaATiempo: pct(aTiempoOptica, entregadas.length),
      },
      canal: { conversacionesNuevas: conversaciones },
    };
  }

  /** Los mismos indicadores mes a mes: una foto no dice si algo mejora. */
  async tendencia(meses: number, siteId?: string) {
    const salida = [];
    const hoy = new Date();

    for (let i = meses - 1; i >= 0; i--) {
      const desde = new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth() - i, 1));
      const hasta = new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth() - i + 1, 0, 23, 59, 59));
      const m = await this.mensual(desde, hasta, siteId);
      salida.push({
        mes: desde.toISOString().slice(0, 7),
        citas: m.agenda.programadas,
        noShow: m.agenda.tasaNoShow,
        oportunidad: m.agenda.oportunidadDias,
        facturado: m.dinero.facturado,
        recaudo: m.dinero.tasaRecaudo,
        pqrsf: m.experiencia.pqrsf,
      });
    }

    return salida;
  }
}
