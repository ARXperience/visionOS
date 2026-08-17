import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, type User } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { InventoryService } from '../inventory/inventory.service';
import { TimelineService } from '../timeline/timeline.service';

interface Ctx {
  actor: User;
  ip?: string | null;
}

const dec = (v?: number) => (v === undefined || v === null ? undefined : new Prisma.Decimal(v));

/**
 * Óptica: fórmula, orden a laboratorio y entrega.
 *
 * La fórmula es dato clínico —la firma un profesional— y por eso es
 * append-only en la base: se corrige emitiendo otra, no reescribiendo la
 * anterior. Un paciente que reclama que "le pusieron mal el eje" necesita que
 * exista la fórmula original, no la corregida.
 */
@Injectable()
export class OpticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly inventario: InventoryService,
    private readonly timeline: TimelineService,
  ) {}

  async emitirFormula(
    datos: {
      personId: string;
      professionalId: string;
      appointmentId?: string;
      mesesVigencia?: number;
      odSphere?: number;
      odCylinder?: number;
      odAxis?: number;
      odAdd?: number;
      oiSphere?: number;
      oiCylinder?: number;
      oiAxis?: number;
      oiAdd?: number;
      pupillaryDistance?: number;
      lensType?: string;
      notes?: string;
    },
    ctx: Ctx,
  ) {
    // El eje solo tiene sentido de 0 a 180: un cilindro con eje 200 es un
    // lente que el laboratorio talla mal y el paciente devuelve.
    for (const [ojo, eje, cil] of [
      ['derecho', datos.odAxis, datos.odCylinder],
      ['izquierdo', datos.oiAxis, datos.oiCylinder],
    ] as const) {
      if (eje !== undefined && (eje < 0 || eje > 180)) {
        throw new BadRequestException(`El eje del ojo ${ojo} debe estar entre 0 y 180 grados.`);
      }
      if (cil !== undefined && cil !== 0 && eje === undefined) {
        throw new BadRequestException(`Hay cilindro en el ojo ${ojo} pero no hay eje.`);
      }
    }

    const vence = new Date();
    vence.setUTCMonth(vence.getUTCMonth() + (datos.mesesVigencia ?? 12));

    const f = await this.prisma.prescription.create({
      data: {
        personId: datos.personId,
        professionalId: datos.professionalId,
        appointmentId: datos.appointmentId,
        validTo: vence,
        odSphere: dec(datos.odSphere),
        odCylinder: dec(datos.odCylinder),
        odAxis: datos.odAxis,
        odAdd: dec(datos.odAdd),
        oiSphere: dec(datos.oiSphere),
        oiCylinder: dec(datos.oiCylinder),
        oiAxis: datos.oiAxis,
        oiAdd: dec(datos.oiAdd),
        pupillaryDistance: dec(datos.pupillaryDistance),
        lensType: datos.lensType?.trim(),
        notes: datos.notes?.trim(),
      },
      select: { id: true, issuedAt: true, validTo: true },
    });

    await this.timeline.emitir({
      personId: datos.personId,
      type: 'FORMULA_OPTICA',
      title: 'Fórmula óptica emitida',
      actorUserId: ctx.actor.id,
      refType: 'prescription',
      refId: f.id,
    });

    await this.audit.record({
      userId: ctx.actor.id,
      action: 'CREATE',
      entityType: 'prescription',
      entityId: f.id,
      personId: datos.personId,
      ipAddress: ctx.ip,
    });

    return f;
  }

  formulas(personId: string) {
    return this.prisma.prescription.findMany({
      where: { personId },
      orderBy: { issuedAt: 'desc' },
      take: 20,
      select: {
        id: true,
        issuedAt: true,
        validTo: true,
        odSphere: true,
        odCylinder: true,
        odAxis: true,
        odAdd: true,
        oiSphere: true,
        oiCylinder: true,
        oiAxis: true,
        oiAdd: true,
        pupillaryDistance: true,
        lensType: true,
        notes: true,
        professional: { select: { displayName: true } },
      },
    });
  }

  private async siguienteNumero(): Promise<string> {
    const anio = new Date().getUTCFullYear();
    const n = await this.prisma.opticalOrder.count({ where: { number: { startsWith: `OP-${anio}-` } } });
    return `OP-${anio}-${String(n + 1).padStart(5, '0')}`;
  }

  async crearOrden(
    datos: {
      prescriptionId: string;
      siteId: string;
      frameProductId?: string;
      frameOwn?: boolean;
      frameNote?: string;
      lensProductId?: string;
      lensNote?: string;
      lab?: string;
      promisedAt?: Date;
      price?: number;
      warrantyMonths?: number;
    },
    ctx: Ctx,
  ) {
    const f = await this.prisma.prescription.findUnique({
      where: { id: datos.prescriptionId },
      select: { id: true, personId: true, validTo: true },
    });
    if (!f) throw new NotFoundException('Fórmula no encontrada');

    // Una fórmula vencida montada en un lente nuevo es un lente que el
    // paciente devuelve y que la clínica paga dos veces.
    if (f.validTo && f.validTo < new Date()) {
      throw new BadRequestException(
        `Esa fórmula venció el ${f.validTo.toISOString().slice(0, 10)}. Tome una nueva antes de pedir los lentes.`,
      );
    }

    if (!datos.frameProductId && !datos.frameOwn && !datos.frameNote) {
      throw new BadRequestException('Indique la montura: del inventario, propia del paciente o descrita.');
    }

    const orden = await this.prisma.opticalOrder.create({
      data: {
        number: await this.siguienteNumero(),
        personId: f.personId,
        siteId: datos.siteId,
        prescriptionId: f.id,
        frameProductId: datos.frameProductId,
        frameOwn: datos.frameOwn ?? false,
        frameNote: datos.frameNote?.trim(),
        lensProductId: datos.lensProductId,
        lensNote: datos.lensNote?.trim(),
        lab: datos.lab?.trim(),
        promisedAt: datos.promisedAt,
        price: dec(datos.price),
        warrantyMonths: datos.warrantyMonths ?? 3,
        createdById: ctx.actor.id,
      },
      select: { id: true, number: true, status: true, promisedAt: true },
    });

    await this.audit.record({
      userId: ctx.actor.id,
      action: 'CREATE',
      entityType: 'optical_order',
      entityId: orden.id,
      personId: f.personId,
      siteId: datos.siteId,
      newValues: { numero: orden.number },
      ipAddress: ctx.ip,
    });

    return orden;
  }

  async enviarALaboratorio(id: string, lab: string, promisedAt: Date | undefined, ctx: Ctx) {
    const o = await this.prisma.opticalOrder.findUnique({ where: { id }, select: { status: true } });
    if (!o) throw new NotFoundException('Orden no encontrada');
    if (o.status !== 'TOMADA') throw new BadRequestException('Ya salió al laboratorio o está más adelante.');

    return this.prisma.opticalOrder.update({
      where: { id },
      data: { status: 'EN_LABORATORIO', lab: lab.trim(), sentAt: new Date(), promisedAt },
      select: { id: true, number: true, status: true, lab: true, promisedAt: true },
    });
  }

  async recibirDeLaboratorio(id: string, ctx: Ctx) {
    const o = await this.prisma.opticalOrder.findUnique({ where: { id }, select: { status: true } });
    if (!o) throw new NotFoundException('Orden no encontrada');
    if (o.status !== 'EN_LABORATORIO') throw new BadRequestException('No está en laboratorio.');

    return this.prisma.opticalOrder.update({
      where: { id },
      data: { status: 'RECIBIDA', receivedAt: new Date() },
      select: { id: true, number: true, status: true, receivedAt: true },
    });
  }

  /**
   * Entrega al paciente. Es lo que descarga el inventario.
   *
   * Se descarga aquí y no al crear la orden porque entre una cosa y otra pasan
   * semanas: descontar al pedir deja la montura "fuera" del inventario
   * mientras sigue físicamente en la vitrina, y el mostrador la vende dos
   * veces.
   */
  async entregar(id: string, deliveredTo: string | undefined, ctx: Ctx) {
    const o = await this.prisma.opticalOrder.findUnique({
      where: { id },
      select: {
        id: true,
        number: true,
        status: true,
        personId: true,
        siteId: true,
        frameProductId: true,
        lensProductId: true,
        warrantyMonths: true,
      },
    });
    if (!o) throw new NotFoundException('Orden no encontrada');
    if (o.status === 'ENTREGADA') throw new BadRequestException('Ya fue entregada.');
    if (o.status !== 'RECIBIDA') {
      throw new BadRequestException('Todavía no llegó del laboratorio: no se puede entregar.');
    }

    // Si no hay existencias, la entrega NO se registra. Entregar algo que el
    // inventario no tiene significa que el inventario ya estaba mal, y
    // taparlo aquí lo deja mal para siempre.
    for (const productId of [o.frameProductId, o.lensProductId].filter(Boolean) as string[]) {
      await this.inventario.mover(
        {
          productId,
          siteId: o.siteId,
          kind: 'SALIDA',
          quantity: 1,
          reason: `Entrega de la orden ${o.number}`,
          refType: 'optical_order',
          refId: o.id,
        },
        ctx,
      );
    }

    const entregada = await this.prisma.opticalOrder.update({
      where: { id },
      data: { status: 'ENTREGADA', deliveredAt: new Date(), deliveredTo: deliveredTo?.trim() },
      select: { id: true, number: true, status: true, deliveredAt: true, warrantyMonths: true },
    });

    await this.timeline.emitir({
      personId: o.personId,
      type: 'GAFAS_ENTREGADAS',
      title: `Gafas entregadas (orden ${o.number})`,
      siteId: o.siteId,
      actorUserId: ctx.actor.id,
      refType: 'optical_order',
      refId: o.id,
    });

    await this.audit.record({
      userId: ctx.actor.id,
      action: 'UPDATE',
      entityType: 'optical_order',
      entityId: id,
      personId: o.personId,
      siteId: o.siteId,
      newValues: { estado: 'ENTREGADA', recibio: deliveredTo ?? 'el paciente' },
      ipAddress: ctx.ip,
    });

    return entregada;
  }

  async anular(id: string, motivo: string, ctx: Ctx) {
    const o = await this.prisma.opticalOrder.findUnique({ where: { id }, select: { status: true, personId: true } });
    if (!o) throw new NotFoundException('Orden no encontrada');
    if (o.status === 'ENTREGADA') {
      throw new BadRequestException('Ya fue entregada: registre una garantía o una devolución, no una anulación.');
    }

    const anulada = await this.prisma.opticalOrder.update({
      where: { id },
      data: { status: 'ANULADA', voidReason: motivo.trim() },
      select: { id: true, number: true, status: true },
    });

    await this.audit.record({
      userId: ctx.actor.id,
      action: 'UPDATE',
      entityType: 'optical_order',
      entityId: id,
      personId: o.personId,
      newValues: { estado: 'ANULADA', motivo },
      ipAddress: ctx.ip,
    });

    return anulada;
  }

  async ordenes(filtro: { status?: string; siteId?: string; personId?: string }) {
    const ordenes = await this.prisma.opticalOrder.findMany({
      where: {
        ...(filtro.status ? { status: filtro.status as never } : {}),
        ...(filtro.siteId ? { siteId: filtro.siteId } : {}),
        ...(filtro.personId ? { personId: filtro.personId } : {}),
      },
      orderBy: [{ status: 'asc' }, { promisedAt: 'asc' }],
      take: 200,
      select: {
        id: true,
        number: true,
        status: true,
        lab: true,
        promisedAt: true,
        sentAt: true,
        receivedAt: true,
        deliveredAt: true,
        deliveredTo: true,
        warrantyMonths: true,
        price: true,
        frameOwn: true,
        frameNote: true,
        lensNote: true,
        person: { select: { id: true, displayName: true, phone: true } },
        site: { select: { code: true } },
        frameProduct: { select: { name: true, brand: true } },
        lensProduct: { select: { name: true } },
        prescription: {
          select: { odSphere: true, odCylinder: true, odAxis: true, oiSphere: true, oiCylinder: true, oiAxis: true, lensType: true },
        },
      },
    });

    const hoy = new Date();
    return ordenes.map((o) => ({
      ...o,
      // Lo único que hace accionable esta lista: qué le prometí al paciente y
      // cuánto lleva el laboratorio pasado de esa fecha.
      diasDeAtraso:
        o.promisedAt && !o.deliveredAt && o.promisedAt < hoy
          ? Math.floor((hoy.getTime() - o.promisedAt.getTime()) / 86_400_000)
          : 0,
      enGarantia: o.deliveredAt
        ? new Date(o.deliveredAt).setMonth(new Date(o.deliveredAt).getMonth() + o.warrantyMonths) > hoy.getTime()
        : false,
    }));
  }
}
