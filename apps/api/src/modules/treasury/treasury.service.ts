import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { Prisma, type User } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

interface Ctx {
  actor: User;
  ip?: string | null;
}

const CERO = new Prisma.Decimal(0);
const D = (n: number) => new Prisma.Decimal(n);

/**
 * ponytail: desfase fijo de −5. Colombia no tiene horario de verano; el día
 * que lo tuviera, aquí va la zona real.
 */
const OFFSET_HORAS = 5;

/**
 * El día de caja al que pertenece un INSTANTE.
 *
 * Un pago recibido a las 6 de la tarde en Bogotá es de ese día, pero en UTC ya
 * es el siguiente. Contarlo en el día equivocado descuadra dos cajas de una
 * vez —la de hoy sobra y la de mañana falta— y es de los errores que se buscan
 * durante una semana.
 */
function diaDe(instante: Date): string {
  return new Date(instante.getTime() - OFFSET_HORAS * 3_600_000).toISOString().slice(0, 10);
}

/**
 * La ventana de un día de CALENDARIO.
 *
 * Recibe "2026-08-16", no un Date, y esa distinción no es cosmética: cuando
 * alguien elige el 16 en un calendario está diciendo un día, no un instante.
 * Pasarlo por `new Date('2026-08-16')` lo convierte en medianoche UTC, que en
 * Bogotá son las 7 de la tarde del 15 — y el cierre se hace sobre el día
 * anterior sin que nadie lo note.
 */
function ventanaDe(dia: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dia)) {
    throw new BadRequestException('La fecha debe venir como AAAA-MM-DD.');
  }
  const desde = new Date(`${dia}T00:00:00.000Z`).getTime() + OFFSET_HORAS * 3_600_000;
  return { dia, desde: new Date(desde), hasta: new Date(desde + 86_400_000 - 1) };
}

/**
 * Tesorería: el cierre de caja.
 *
 * El sistema sabe cuánto DEBERÍA haber —la suma de los pagos en efectivo del
 * día— pero no sabe cuánto HAY. Esa diferencia es el único dato que importa, y
 * una caja que siempre cuadra al peso es una caja que no se está contando.
 */
@Injectable()
export class TreasuryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /** Lo que el sistema espera encontrar, desglosado por medio de pago. */
  async esperado(siteId: string, dia: string) {
    const { desde, hasta } = ventanaDe(dia);

    const pagos = await this.prisma.payment.findMany({
      where: { receivedAt: { gte: desde, lte: hasta }, invoice: { siteId } },
      select: {
        amount: true,
        method: true,
        reference: true,
        receivedAt: true,
        invoice: { select: { number: true, person: { select: { displayName: true } } } },
      },
      orderBy: { receivedAt: 'asc' },
    });

    const por = (metodos: string[]) =>
      pagos.filter((p) => metodos.includes(p.method)).reduce((s, p) => s.plus(p.amount), CERO);

    return {
      fecha: dia,
      efectivo: por(['EFECTIVO']),
      tarjeta: por(['TARJETA_DEBITO', 'TARJETA_CREDITO']),
      transferencia: por(['TRANSFERENCIA', 'PSE']),
      otros: por(['BONO', 'OTRO']),
      total: pagos.reduce((s, p) => s.plus(p.amount), CERO),
      movimientos: pagos.length,
      detalle: pagos.map((p) => ({
        hora: p.receivedAt.toISOString().slice(11, 16),
        factura: p.invoice.number,
        paciente: p.invoice.person.displayName,
        medio: p.method,
        referencia: p.reference,
        valor: p.amount.toFixed(2),
      })),
    };
  }

  /**
   * Cierra la caja del día.
   *
   * El esperado se congela. Si se recalculara al abrir el cierre después, un
   * pago registrado tarde borraría el descuadre que hubo ese día, que es
   * justo lo que hay que poder revisar.
   */
  async cerrar(
    datos: { siteId: string; fecha: string; countedCash: number; openingFloat?: number; notes?: string },
    ctx: Ctx,
  ) {
    const { dia } = ventanaDe(datos.fecha);
    const fechaDia = new Date(`${dia}T00:00:00.000Z`);

    const ya = await this.prisma.cashClose.findUnique({
      where: { siteId_date: { siteId: datos.siteId, date: fechaDia } },
      select: { id: true },
    });
    // Cerrar dos veces el mismo día permitiría "arreglar" un descuadre
    // volviéndolo a cerrar con otro conteo.
    if (ya) throw new ConflictException(`La caja del ${dia} ya fue cerrada.`);

    if (dia > diaDe(new Date())) throw new BadRequestException('No se cierra una caja del futuro.');

    const e = await this.esperado(datos.siteId, dia);
    const contado = D(datos.countedCash);
    const base = D(datos.openingFloat ?? 0);
    // El esperado en caja incluye la base con la que se abrió.
    const esperadoEnCaja = e.efectivo.plus(base);
    const diferencia = contado.minus(esperadoEnCaja);

    const cierre = await this.prisma.cashClose.create({
      data: {
        siteId: datos.siteId,
        date: fechaDia,
        expectedCash: esperadoEnCaja,
        countedCash: contado,
        difference: diferencia,
        expectedCard: e.tarjeta,
        expectedTransfer: e.transferencia,
        expectedOther: e.otros,
        openingFloat: base,
        notes: datos.notes?.trim(),
        closedById: ctx.actor.id,
      },
      select: {
        id: true,
        date: true,
        expectedCash: true,
        countedCash: true,
        difference: true,
      },
    });

    await this.audit.record({
      userId: ctx.actor.id,
      action: 'CREATE',
      entityType: 'cash_close',
      entityId: cierre.id,
      siteId: datos.siteId,
      newValues: {
        fecha: dia,
        esperado: esperadoEnCaja.toString(),
        contado: contado.toString(),
        diferencia: diferencia.toString(),
      },
      ipAddress: ctx.ip,
    });

    return {
      ...cierre,
      cuadra: diferencia.isZero(),
      // El texto que la persona de caja necesita leer, no el número crudo.
      mensaje: diferencia.isZero()
        ? 'La caja cuadra.'
        : diferencia.greaterThan(CERO)
          ? `Sobran ${diferencia.toFixed(2)}. Revise si algún pago no se registró.`
          : `Faltan ${diferencia.abs().toFixed(2)}. Revise los comprobantes del día.`,
    };
  }

  async historico(siteId?: string, dias = 30) {
    const desde = new Date();
    desde.setUTCDate(desde.getUTCDate() - dias);

    const cierres = await this.prisma.cashClose.findMany({
      where: { date: { gte: desde }, ...(siteId ? { siteId } : {}) },
      orderBy: { date: 'desc' },
      select: {
        id: true,
        date: true,
        expectedCash: true,
        countedCash: true,
        difference: true,
        expectedCard: true,
        expectedTransfer: true,
        notes: true,
        site: { select: { code: true } },
        closedBy: { select: { firstName: true, lastName: true } },
      },
    });

    const descuadres = cierres.filter((c) => !c.difference.isZero());

    return {
      cierres,
      // Lo que hay que mirar: no el total, sino cuántas veces no cuadró y
      // cuánto suma. Un peso de diferencia cada día es un problema distinto
      // a cien mil una sola vez.
      diasConDescuadre: descuadres.length,
      sumaDescuadres: descuadres.reduce((s, c) => s.plus(c.difference), CERO).toFixed(2),
      faltantes: descuadres
        .filter((c) => c.difference.lessThan(CERO))
        .reduce((s, c) => s.plus(c.difference.abs()), CERO)
        .toFixed(2),
    };
  }

  /** Días con dinero recibido que nadie cerró. */
  async sinCerrar(siteId?: string) {
    const desde = new Date();
    desde.setUTCDate(desde.getUTCDate() - 60);

    const pagos = await this.prisma.payment.findMany({
      where: { receivedAt: { gte: desde }, ...(siteId ? { invoice: { siteId } } : {}) },
      select: { receivedAt: true, invoice: { select: { siteId: true, site: { select: { code: true } } } } },
    });

    const cierres = await this.prisma.cashClose.findMany({
      where: { date: { gte: desde }, ...(siteId ? { siteId } : {}) },
      select: { siteId: true, date: true },
    });
    const cerrados = new Set(cierres.map((c) => `${c.siteId}|${c.date.toISOString().slice(0, 10)}`));

    const hoy = diaDe(new Date());
    const pendientes = new Map<string, { sede: string; fecha: string; siteId: string }>();

    for (const p of pagos) {
      const dia = diaDe(p.receivedAt);
      // El día en curso no está pendiente: todavía no ha terminado.
      if (dia === hoy) continue;
      const clave = `${p.invoice.siteId}|${dia}`;
      if (cerrados.has(clave)) continue;
      pendientes.set(clave, { sede: p.invoice.site.code, fecha: dia, siteId: p.invoice.siteId });
    }

    return [...pendientes.values()].sort((a, b) => a.fecha.localeCompare(b.fecha));
  }
}
