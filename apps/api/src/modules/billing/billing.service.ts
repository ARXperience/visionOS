import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, type InvoiceStatus, type PaymentMethod, type User } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { diasVencida, tramoDe } from './edades';

interface Ctx {
  actor: User;
  ip?: string | null;
}

const D = (n: number | string | Prisma.Decimal) => new Prisma.Decimal(n);
const CERO = D(0);

/**
 * Facturación interna y cartera.
 *
 * NO es la factura electrónica de la DIAN: esa la emite un proveedor
 * autorizado y sigue fuera de alcance. Esto es lo que hace falta antes —
 * saber cuánto se debe, quién lo debe y desde hace cuánto.
 *
 * Todo el dinero es Decimal. Un `number` de JavaScript no representa 0.1
 * exactamente, y en pesos ese error aparece el día en que la suma de las
 * líneas no da el total de la factura y nadie sabe por qué.
 */
@Injectable()
export class BillingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private async siguienteNumero(): Promise<string> {
    const anio = new Date().getUTCFullYear();
    const cuantas = await this.prisma.invoice.count({ where: { number: { startsWith: `FV-${anio}-` } } });
    return `FV-${anio}-${String(cuantas + 1).padStart(6, '0')}`;
  }

  /**
   * Tarifa vigente para un servicio y un pagador.
   *
   * El orden importa: primero la tarifa del pagador en esa sede, luego la del
   * pagador en la red, luego la particular. Cobrar la tarifa de red cuando
   * existe una negociada por sede es facturar de menos y no enterarse.
   */
  private async tarifa(serviceId: string, payerId: string | null, siteId: string) {
    const hoy = new Date();
    const vigentes = await this.prisma.servicePrice.findMany({
      where: {
        serviceId,
        validFrom: { lte: hoy },
        OR: [{ validTo: null }, { validTo: { gte: hoy } }],
      },
      select: { price: true, copay: true, payerId: true, siteId: true },
    });

    const puntaje = (p: (typeof vigentes)[number]) =>
      (p.payerId === payerId ? 2 : p.payerId === null && payerId === null ? 2 : 0) +
      (p.siteId === siteId ? 1 : 0);

    const mejor = vigentes
      .filter((p) => p.payerId === payerId || p.payerId === null)
      .sort((a, b) => puntaje(b) - puntaje(a))[0];

    return mejor ?? null;
  }

  async crear(
    datos: { personId: string; siteId: string; payerId?: string; notes?: string },
    ctx: Ctx,
  ) {
    const f = await this.prisma.invoice.create({
      data: {
        number: await this.siguienteNumero(),
        personId: datos.personId,
        siteId: datos.siteId,
        payerId: datos.payerId,
        notes: datos.notes?.trim(),
        createdById: ctx.actor.id,
      },
      select: { id: true, number: true, status: true },
    });

    await this.audit.record({
      userId: ctx.actor.id,
      action: 'CREATE',
      entityType: 'invoice',
      entityId: f.id,
      personId: datos.personId,
      siteId: datos.siteId,
      newValues: { numero: f.number },
      ipAddress: ctx.ip,
    });

    return f;
  }

  /**
   * Agrega una línea y recalcula el total en la MISMA transacción.
   *
   * Recalcular después, en otra llamada, deja una ventana en la que la
   * factura dice un total que sus líneas no suman. Es la clase de
   * inconsistencia que nadie ve hasta que un asegurador la glosa.
   */
  async agregarItem(
    invoiceId: string,
    datos: { serviceId: string; quantity?: number; unitPrice?: number; discount?: number; appointmentId?: string },
    ctx: Ctx,
  ) {
    const f = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      select: { id: true, status: true, personId: true, payerId: true, siteId: true },
    });
    if (!f) throw new NotFoundException('Factura no encontrada');
    if (f.status !== 'BORRADOR') {
      throw new BadRequestException(
        'Solo se modifican facturas en borrador. Una factura emitida se anula y se hace otra.',
      );
    }

    const servicio = await this.prisma.service.findUnique({
      where: { id: datos.serviceId },
      select: { id: true, name: true, cupsCode: true },
    });
    if (!servicio) throw new NotFoundException('Servicio no encontrado');

    const tarifa = await this.tarifa(datos.serviceId, f.payerId, f.siteId);
    const precio = datos.unitPrice !== undefined ? D(datos.unitPrice) : (tarifa?.price ?? null);
    if (precio === null) {
      throw new BadRequestException(
        `No hay tarifa vigente para "${servicio.name}" con ese pagador. Indique el valor o cargue la tarifa.`,
      );
    }

    const cantidad = datos.quantity ?? 1;
    const descuento = D(datos.discount ?? 0);
    const total = precio.mul(cantidad).minus(descuento);
    if (total.lessThan(CERO)) {
      throw new BadRequestException('El descuento no puede superar el valor de la línea.');
    }

    return this.prisma.$transaction(async (tx) => {
      const item = await tx.invoiceItem.create({
        data: {
          invoiceId,
          serviceId: servicio.id,
          appointmentId: datos.appointmentId,
          // Se copian, no se leen por relación: el CUPS o el nombre de hoy no
          // pueden cambiar lo que dice una factura ya emitida.
          cupsCode: servicio.cupsCode,
          description: servicio.name,
          quantity: cantidad,
          unitPrice: precio,
          discount: descuento,
          total,
        },
        select: { id: true, description: true, total: true },
      });

      await this.recalcular(invoiceId, tarifa?.copay ?? null, tx);
      return item;
    });
  }

  async quitarItem(itemId: string, ctx: Ctx) {
    const item = await this.prisma.invoiceItem.findUnique({
      where: { id: itemId },
      select: { invoiceId: true, invoice: { select: { status: true } } },
    });
    if (!item) throw new NotFoundException('Línea no encontrada');
    if (item.invoice.status !== 'BORRADOR') {
      throw new BadRequestException('Solo se modifican facturas en borrador.');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.invoiceItem.delete({ where: { id: itemId } });
      return this.recalcular(item.invoiceId, null, tx);
    });
  }

  /** El total sale SIEMPRE de las líneas; nunca se escribe a mano. */
  private async recalcular(
    invoiceId: string,
    copayUnitario: Prisma.Decimal | null,
    tx: Prisma.TransactionClient,
  ) {
    const items = await tx.invoiceItem.findMany({
      where: { invoiceId },
      select: { total: true, discount: true, quantity: true },
    });

    const subtotal = items.reduce((s, i) => s.plus(i.total).plus(i.discount), CERO);
    const descuento = items.reduce((s, i) => s.plus(i.discount), CERO);
    const total = subtotal.minus(descuento);

    const actual = await tx.invoice.findUniqueOrThrow({
      where: { id: invoiceId },
      select: { copay: true },
    });
    const copay = copayUnitario
      ? actual.copay.plus(copayUnitario.mul(items.at(-1)?.quantity ?? 1))
      : actual.copay;

    return tx.invoice.update({
      where: { id: invoiceId },
      data: { subtotal, discount: descuento, total, copay },
      select: { id: true, number: true, subtotal: true, discount: true, copay: true, total: true },
    });
  }

  /**
   * Emite la factura: la congela y arranca el reloj de la cartera.
   *
   * `dueDate` no es opcional en la práctica: sin fecha límite un saldo no se
   * puede clasificar por edades, y una cartera sin edades es una lista que
   * nadie prioriza.
   */
  async emitir(id: string, diasPlazo: number, ctx: Ctx) {
    const f = await this.prisma.invoice.findUnique({
      where: { id },
      select: { id: true, status: true, total: true, personId: true, siteId: true, _count: { select: { items: true } } },
    });
    if (!f) throw new NotFoundException('Factura no encontrada');
    if (f.status !== 'BORRADOR') throw new BadRequestException('Ya fue emitida o anulada.');
    if (!f._count.items) throw new BadRequestException('Una factura sin líneas no se emite.');
    if (f.total.lessThanOrEqualTo(CERO)) {
      throw new BadRequestException('El total es cero: revise las tarifas antes de emitir.');
    }

    const vence = new Date();
    vence.setUTCDate(vence.getUTCDate() + diasPlazo);

    const emitida = await this.prisma.invoice.update({
      where: { id },
      data: { status: 'EMITIDA', issuedAt: new Date(), dueDate: vence },
      select: { id: true, number: true, status: true, total: true, dueDate: true },
    });

    await this.audit.record({
      userId: ctx.actor.id,
      action: 'UPDATE',
      entityType: 'invoice',
      entityId: id,
      personId: f.personId,
      siteId: f.siteId,
      newValues: { estado: 'EMITIDA', total: f.total.toString() },
      ipAddress: ctx.ip,
    });

    return emitida;
  }

  async anular(id: string, motivo: string, ctx: Ctx) {
    const f = await this.prisma.invoice.findUnique({
      where: { id },
      select: { id: true, status: true, personId: true, _count: { select: { payments: true } } },
    });
    if (!f) throw new NotFoundException('Factura no encontrada');
    if (f.status === 'ANULADA') throw new BadRequestException('Ya está anulada.');
    if (f._count.payments > 0) {
      // Anular algo ya pagado dejaría un pago colgando de una factura que
      // "no existe" y el dinero sin explicación en la caja del día.
      throw new ConflictException(
        'Tiene pagos registrados. Reverse los pagos con una nota antes de anular.',
      );
    }

    const anulada = await this.prisma.invoice.update({
      where: { id },
      data: { status: 'ANULADA', voidedAt: new Date(), voidReason: motivo.trim() },
      select: { id: true, number: true, status: true },
    });

    await this.audit.record({
      userId: ctx.actor.id,
      action: 'UPDATE',
      entityType: 'invoice',
      entityId: id,
      personId: f.personId,
      newValues: { estado: 'ANULADA', motivo },
      ipAddress: ctx.ip,
    });

    return anulada;
  }

  /**
   * Registra un pago. No se puede editar ni borrar: la base lo impide con un
   * trigger. Un cobro mal registrado se corrige con otro en negativo.
   */
  async registrarPago(
    invoiceId: string,
    datos: { amount: number; method: PaymentMethod; reference?: string; notes?: string },
    ctx: Ctx,
  ) {
    const f = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      select: {
        id: true,
        status: true,
        total: true,
        personId: true,
        siteId: true,
        payments: { select: { amount: true } },
      },
    });
    if (!f) throw new NotFoundException('Factura no encontrada');
    if (f.status === 'ANULADA') throw new BadRequestException('La factura está anulada.');
    if (f.status === 'BORRADOR') throw new BadRequestException('Emita la factura antes de cobrarla.');

    const monto = D(datos.amount);
    if (monto.equals(CERO)) throw new BadRequestException('El pago no puede ser cero.');

    const pagado = f.payments.reduce((s, p) => s.plus(p.amount), CERO);
    const nuevoSaldo = f.total.minus(pagado).minus(monto);

    // Un pago que deja el saldo en negativo es un cobro de más. Se detiene
    // aquí en vez de aparecer como un saldo a favor que nadie devuelve.
    if (nuevoSaldo.lessThan(CERO)) {
      throw new BadRequestException(
        `Ese pago excede el saldo. Debe ${f.total.minus(pagado).toFixed(2)} y se intentó cobrar ${monto.toFixed(2)}.`,
      );
    }

    const pago = await this.prisma.$transaction(async (tx) => {
      const p = await tx.payment.create({
        data: {
          invoiceId,
          amount: monto,
          method: datos.method,
          reference: datos.reference?.trim(),
          notes: datos.notes?.trim(),
          receivedById: ctx.actor.id,
        },
        select: { id: true, amount: true, method: true, receivedAt: true },
      });

      if (nuevoSaldo.equals(CERO)) {
        await tx.invoice.update({ where: { id: invoiceId }, data: { status: 'PAGADA' } });
      }
      return p;
    });

    await this.audit.record({
      userId: ctx.actor.id,
      action: 'CREATE',
      entityType: 'payment',
      entityId: pago.id,
      personId: f.personId,
      siteId: f.siteId,
      newValues: { monto: monto.toString(), medio: datos.method, saldo: nuevoSaldo.toString() },
      ipAddress: ctx.ip,
    });

    return { ...pago, saldo: nuevoSaldo };
  }

  /** Radicación ante el asegurador. Sin número y fecha, la EPS dice que nunca llegó. */
  async radicar(id: string, numero: string, ctx: Ctx) {
    const f = await this.prisma.invoice.update({
      where: { id },
      data: { filedAt: new Date(), filedNumber: numero.trim() },
      select: { id: true, number: true, filedAt: true, filedNumber: true, personId: true },
    });

    await this.audit.record({
      userId: ctx.actor.id,
      action: 'UPDATE',
      entityType: 'invoice',
      entityId: id,
      personId: f.personId,
      newValues: { radicado: numero },
      ipAddress: ctx.ip,
    });

    return f;
  }

  async registrarGlosa(
    invoiceId: string,
    datos: { code: string; reason: string; amount: number },
    ctx: Ctx,
  ) {
    const f = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      select: { total: true, personId: true },
    });
    if (!f) throw new NotFoundException('Factura no encontrada');

    const monto = D(datos.amount);
    if (monto.greaterThan(f.total)) {
      throw new BadRequestException('La glosa no puede superar el valor de la factura.');
    }

    const g = await this.prisma.glosa.create({
      data: { invoiceId, code: datos.code.trim(), reason: datos.reason.trim(), amount: monto, createdById: ctx.actor.id },
      select: { id: true, code: true, amount: true, status: true },
    });

    await this.audit.record({
      userId: ctx.actor.id,
      action: 'CREATE',
      entityType: 'glosa',
      entityId: g.id,
      personId: f.personId,
      newValues: { codigo: datos.code, monto: monto.toString() },
      ipAddress: ctx.ip,
    });

    return g;
  }

  async responderGlosa(
    id: string,
    datos: { answer: string; acceptedAmount?: number },
    ctx: Ctx,
  ) {
    const g = await this.prisma.glosa.findUnique({
      where: { id },
      select: { id: true, amount: true, answeredAt: true, invoice: { select: { personId: true } } },
    });
    if (!g) throw new NotFoundException('Glosa no encontrada');
    if (g.answeredAt) throw new BadRequestException('Ya fue respondida.');

    const aceptado = datos.acceptedAmount !== undefined ? D(datos.acceptedAmount) : CERO;
    if (aceptado.greaterThan(g.amount)) {
      throw new BadRequestException('No se puede aceptar más de lo glosado.');
    }

    const respondida = await this.prisma.glosa.update({
      where: { id },
      data: {
        answer: datos.answer.trim(),
        answeredAt: new Date(),
        acceptedAmount: aceptado,
        // Aceptar todo la cierra; aceptar parte o nada la deja en disputa.
        status: aceptado.equals(g.amount) ? 'ACEPTADA' : 'RESPONDIDA',
      },
      select: { id: true, status: true, acceptedAmount: true },
    });

    await this.audit.record({
      userId: ctx.actor.id,
      action: 'UPDATE',
      entityType: 'glosa',
      entityId: id,
      personId: g.invoice.personId,
      newValues: { aceptado: aceptado.toString(), recuperado: g.amount.minus(aceptado).toString() },
      ipAddress: ctx.ip,
    });

    return respondida;
  }

  async listar(filtro: { status?: InvoiceStatus; personId?: string; payerId?: string; siteId?: string }) {
    const facturas = await this.prisma.invoice.findMany({
      where: {
        ...(filtro.status ? { status: filtro.status } : {}),
        ...(filtro.personId ? { personId: filtro.personId } : {}),
        ...(filtro.payerId ? { payerId: filtro.payerId } : {}),
        ...(filtro.siteId ? { siteId: filtro.siteId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
      select: {
        id: true,
        number: true,
        status: true,
        subtotal: true,
        discount: true,
        copay: true,
        total: true,
        issuedAt: true,
        dueDate: true,
        filedNumber: true,
        createdAt: true,
        person: { select: { id: true, displayName: true, docNumber: true } },
        payer: { select: { id: true, name: true } },
        site: { select: { code: true } },
        items: { select: { id: true, description: true, quantity: true, unitPrice: true, total: true } },
        payments: { select: { id: true, amount: true, method: true, receivedAt: true, reference: true } },
        glosas: { select: { id: true, code: true, reason: true, amount: true, status: true, acceptedAmount: true } },
      },
    });

    return facturas.map((f) => {
      const pagado = f.payments.reduce((s, p) => s.plus(p.amount), CERO);
      return { ...f, pagado, saldo: f.total.minus(pagado) };
    });
  }

  /**
   * Cartera por edades.
   *
   * Los tramos son los que usa cualquier área de cartera en Colombia. Lo que
   * importa no es el total adeudado —ese número no dice qué hacer— sino
   * cuánto lleva más de 90 días: eso es lo que se cobra hoy y lo que se está
   * a punto de perder.
   */
  async cartera(payerId?: string) {
    const pendientes = await this.prisma.invoice.findMany({
      where: {
        status: 'EMITIDA',
        ...(payerId ? { payerId } : {}),
      },
      select: {
        id: true,
        number: true,
        total: true,
        dueDate: true,
        issuedAt: true,
        payer: { select: { id: true, name: true } },
        person: { select: { displayName: true } },
        payments: { select: { amount: true } },
        glosas: { select: { amount: true, acceptedAmount: true, status: true } },
      },
    });

    const hoy = new Date();
    const tramos = { alDia: CERO, d1a30: CERO, d31a60: CERO, d61a90: CERO, mas90: CERO };
    const porPagador = new Map<string, { nombre: string; saldo: Prisma.Decimal; facturas: number }>();
    let enGlosa = CERO;
    const detalle: {
      id: string;
      numero: string;
      pagador: string;
      paciente: string;
      saldo: string;
      diasVencida: number;
    }[] = [];

    for (const f of pendientes) {
      const pagado = f.payments.reduce((s, p) => s.plus(p.amount), CERO);
      const saldo = f.total.minus(pagado);
      if (saldo.lessThanOrEqualTo(CERO)) continue;

      const dias = diasVencida(f.dueDate, hoy);
      const tramo = tramoDe(dias);
      tramos[tramo] = tramos[tramo].plus(saldo);

      enGlosa = enGlosa.plus(
        f.glosas
          .filter((g) => g.status === 'RECIBIDA' || g.status === 'RESPONDIDA')
          .reduce((s, g) => s.plus(g.amount), CERO),
      );

      const clave = f.payer?.id ?? 'particular';
      const previo = porPagador.get(clave) ?? {
        nombre: f.payer?.name ?? 'Particular',
        saldo: CERO,
        facturas: 0,
      };
      porPagador.set(clave, { ...previo, saldo: previo.saldo.plus(saldo), facturas: previo.facturas + 1 });

      detalle.push({
        id: f.id,
        numero: f.number,
        pagador: f.payer?.name ?? 'Particular',
        paciente: f.person.displayName,
        saldo: saldo.toFixed(2),
        diasVencida: Math.max(0, dias),
      });
    }

    detalle.sort((a, b) => b.diasVencida - a.diasVencida);

    return {
      tramos: Object.fromEntries(Object.entries(tramos).map(([k, v]) => [k, v.toFixed(2)])),
      total: Object.values(tramos).reduce((s, v) => s.plus(v), CERO).toFixed(2),
      enGlosa: enGlosa.toFixed(2),
      porPagador: [...porPagador.values()]
        .map((p) => ({ ...p, saldo: p.saldo.toFixed(2) }))
        .sort((a, b) => Number(b.saldo) - Number(a.saldo)),
      detalle: detalle.slice(0, 100),
    };
  }
}
