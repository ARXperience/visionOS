import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, type ProductKind, type StockMoveKind, type User } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

interface Ctx {
  actor: User;
  ip?: string | null;
}

/** Los que suman al saldo. El resto resta. */
const SUMAN: StockMoveKind[] = ['ENTRADA', 'TRASLADO_ENTRADA'];

interface Movimiento {
  productId: string;
  siteId: string;
  kind: StockMoveKind;
  quantity: number;
  lot?: string;
  expiresAt?: Date;
  reason?: string;
  refType?: string;
  refId?: string;
  unitCost?: number;
}

/**
 * Inventario por sede y lote.
 *
 * El saldo de `StockLevel` es una caché, no la verdad: la verdad es el libro
 * de movimientos, y por eso el libro es append-only en la base. El saldo se
 * mueve SIEMPRE dentro de la misma transacción que su movimiento, para que no
 * puedan discrepar, y se puede reconstruir sumando el libro.
 */
@Injectable()
export class InventoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  crearProducto(datos: {
    sku: string;
    name: string;
    kind: ProductKind;
    brand?: string;
    model?: string;
    unit?: string;
    invima?: string;
    tracksLot?: boolean;
    minQty?: number;
    salePrice?: number;
    costPrice?: number;
  }) {
    return this.prisma.product.create({
      data: {
        ...datos,
        sku: datos.sku.trim().toUpperCase(),
        salePrice: datos.salePrice !== undefined ? new Prisma.Decimal(datos.salePrice) : undefined,
        costPrice: datos.costPrice !== undefined ? new Prisma.Decimal(datos.costPrice) : undefined,
      },
      select: { id: true, sku: true, name: true, kind: true, tracksLot: true },
    });
  }

  productos(filtro: { kind?: ProductKind; buscar?: string; soloActivos?: boolean }) {
    return this.prisma.product.findMany({
      where: {
        ...(filtro.kind ? { kind: filtro.kind } : {}),
        ...(filtro.soloActivos === false ? {} : { isActive: true }),
        ...(filtro.buscar
          ? {
              OR: [
                { name: { contains: filtro.buscar, mode: 'insensitive' } },
                { sku: { contains: filtro.buscar, mode: 'insensitive' } },
                { brand: { contains: filtro.buscar, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { name: 'asc' },
      take: 300,
      select: {
        id: true,
        sku: true,
        name: true,
        kind: true,
        brand: true,
        model: true,
        unit: true,
        invima: true,
        tracksLot: true,
        minQty: true,
        salePrice: true,
        isActive: true,
        levels: {
          select: { siteId: true, lot: true, expiresAt: true, quantity: true, minQty: true, site: { select: { code: true } } },
        },
      },
    });
  }

  /**
   * Registra un movimiento y mueve el saldo en la misma transacción.
   *
   * Es el único camino: no hay forma de tocar `StockLevel` sin dejar la fila
   * del libro que lo explica.
   */
  async mover(datos: Movimiento, ctx: Ctx) {
    return this.prisma.$transaction((tx) => this.moverEn(tx, datos, ctx));
  }

  /**
   * El movimiento propiamente dicho, sobre una transacción que abre quien
   * llama. Existe separado para que un traslado —dos movimientos que tienen
   * que pasar juntos o no pasar— use UNA sola transacción.
   */
  private async moverEn(tx: Prisma.TransactionClient, datos: Movimiento, ctx: Ctx) {
    if (!Number.isInteger(datos.quantity) || datos.quantity <= 0) {
      // El signo lo pone `kind`. Aceptar negativos aquí permitiría una
      // "entrada de −5" que descuadra el libro sin que nadie lo lea mal.
      throw new BadRequestException('La cantidad es siempre positiva: el signo lo da el tipo de movimiento.');
    }

    const producto = await tx.product.findUnique({
      where: { id: datos.productId },
      select: { id: true, name: true, tracksLot: true, isActive: true },
    });
    if (!producto) throw new NotFoundException('Producto no encontrado');

    const lote = (datos.lot ?? '').trim();

    if (producto.tracksLot && datos.kind === 'ENTRADA') {
      if (!lote) {
        throw new BadRequestException(
          `"${producto.name}" exige lote: sin él no se puede retirar del mercado ni rastrear cuando algo sale mal.`,
        );
      }
      if (!datos.expiresAt) {
        throw new BadRequestException(`"${producto.name}" exige fecha de vencimiento.`);
      }
    }

    if (!producto.isActive && datos.kind !== 'AJUSTE' && datos.kind !== 'BAJA') {
      throw new BadRequestException('El producto está inactivo: solo se puede ajustar o dar de baja.');
    }

    {
      const nivel = await tx.stockLevel.findUnique({
        where: { productId_siteId_lot: { productId: datos.productId, siteId: datos.siteId, lot: lote } },
        select: { id: true, quantity: true, expiresAt: true },
      });

      const suma = SUMAN.includes(datos.kind);
      const actual = nivel?.quantity ?? 0;
      const nuevo = suma ? actual + datos.quantity : actual - datos.quantity;

      if (nuevo < 0) {
        throw new ConflictException(
          `No hay existencias suficientes de "${producto.name}"${lote ? ` (lote ${lote})` : ''}: hay ${actual} y se piden ${datos.quantity}.`,
        );
      }

      // Un lote vencido no sale para uso en un paciente. Darlo de baja sí,
      // que es justo lo que hay que hacer con él.
      if (!suma && datos.kind !== 'BAJA' && nivel?.expiresAt && nivel.expiresAt < new Date()) {
        throw new ConflictException(
          `El lote ${lote} venció el ${nivel.expiresAt.toISOString().slice(0, 10)}. Dese de baja en vez de usarlo.`,
        );
      }

      await tx.stockLevel.upsert({
        where: { productId_siteId_lot: { productId: datos.productId, siteId: datos.siteId, lot: lote } },
        create: {
          productId: datos.productId,
          siteId: datos.siteId,
          lot: lote,
          expiresAt: datos.expiresAt,
          quantity: nuevo,
        },
        update: {
          quantity: nuevo,
          // El vencimiento solo se fija al entrar mercancía; una salida no
          // puede reescribirlo.
          ...(suma && datos.expiresAt ? { expiresAt: datos.expiresAt } : {}),
        },
      });

      const mov = await tx.stockMovement.create({
        data: {
          productId: datos.productId,
          siteId: datos.siteId,
          kind: datos.kind,
          lot: lote,
          expiresAt: datos.expiresAt,
          quantity: datos.quantity,
          balance: nuevo,
          reason: datos.reason?.trim(),
          refType: datos.refType,
          refId: datos.refId,
          unitCost: datos.unitCost !== undefined ? new Prisma.Decimal(datos.unitCost) : undefined,
          createdById: ctx.actor.id,
        },
        select: { id: true, kind: true, quantity: true, balance: true, lot: true },
      });

      return mov;
    }
  }

  /**
   * Traslado entre sedes: dos movimientos en UNA transacción.
   *
   * Si el segundo falla, el primero se revierte. Con dos llamadas sueltas la
   * mercancía se evapora de una sede sin aparecer en la otra, y el descuadre
   * no se descubre hasta el siguiente conteo físico.
   */
  async trasladar(
    datos: { productId: string; desdeSiteId: string; haciaSiteId: string; quantity: number; lot?: string; reason?: string },
    ctx: Ctx,
  ) {
    if (datos.desdeSiteId === datos.haciaSiteId) {
      throw new BadRequestException('El origen y el destino son la misma sede.');
    }

    const lote = (datos.lot ?? '').trim();

    return this.prisma.$transaction(async (tx) => {
      const origen = await tx.stockLevel.findUnique({
        where: { productId_siteId_lot: { productId: datos.productId, siteId: datos.desdeSiteId, lot: lote } },
        select: { expiresAt: true },
      });

      await this.moverEn(
        tx,
        {
          productId: datos.productId,
          siteId: datos.desdeSiteId,
          kind: 'TRASLADO_SALIDA',
          quantity: datos.quantity,
          lot: lote,
          reason: datos.reason,
        },
        ctx,
      );

      return this.moverEn(
        tx,
        {
          productId: datos.productId,
          siteId: datos.haciaSiteId,
          kind: 'TRASLADO_ENTRADA',
          quantity: datos.quantity,
          lot: lote,
          // El vencimiento viaja con la mercancía: si no, el lote llega a la
          // otra sede sin fecha y deja de avisar cuando esté por vencerse.
          expiresAt: origen?.expiresAt ?? undefined,
          reason: datos.reason,
        },
        ctx,
      );
    });
  }

  /**
   * Lo que hay que mirar antes de que empiece el día.
   *
   * Un inventario que solo lista existencias no sirve: nadie lee 400 filas.
   * Lo accionable es lo que falta y lo que se está por vencer.
   */
  async alertas(siteId?: string) {
    const en30 = new Date();
    en30.setUTCDate(en30.getUTCDate() + 30);

    const niveles = await this.prisma.stockLevel.findMany({
      where: { ...(siteId ? { siteId } : {}), product: { isActive: true } },
      select: {
        quantity: true,
        minQty: true,
        lot: true,
        expiresAt: true,
        site: { select: { id: true, code: true } },
        product: { select: { id: true, sku: true, name: true, minQty: true, unit: true, kind: true } },
      },
    });

    const porProducto = new Map<string, { producto: (typeof niveles)[number]['product']; sede: string; total: number; minimo: number }>();
    const vencidos: typeof niveles = [];
    const porVencer: typeof niveles = [];

    for (const n of niveles) {
      const clave = `${n.product.id}:${n.site.id}`;
      const minimo = n.minQty ?? n.product.minQty;
      const previo = porProducto.get(clave) ?? { producto: n.product, sede: n.site.code, total: 0, minimo };
      porProducto.set(clave, { ...previo, total: previo.total + n.quantity, minimo });

      if (n.expiresAt && n.quantity > 0) {
        if (n.expiresAt < new Date()) vencidos.push(n);
        else if (n.expiresAt <= en30) porVencer.push(n);
      }
    }

    const bajoMinimo = [...porProducto.values()].filter((p) => p.minimo > 0 && p.total <= p.minimo);

    const formato = (n: (typeof niveles)[number]) => ({
      producto: n.product.name,
      sku: n.product.sku,
      sede: n.site.code,
      lote: n.lot || null,
      cantidad: n.quantity,
      vence: n.expiresAt?.toISOString().slice(0, 10) ?? null,
    });

    return {
      bajoMinimo: bajoMinimo
        .map((p) => ({ producto: p.producto.name, sku: p.producto.sku, sede: p.sede, hay: p.total, minimo: p.minimo }))
        .sort((a, b) => a.hay - b.hay),
      vencidos: vencidos.map(formato),
      porVencer: porVencer
        .map(formato)
        .sort((a, b) => (a.vence ?? '').localeCompare(b.vence ?? '')),
    };
  }

  movimientos(filtro: { productId?: string; siteId?: string; refType?: string; refId?: string }) {
    return this.prisma.stockMovement.findMany({
      where: {
        ...(filtro.productId ? { productId: filtro.productId } : {}),
        ...(filtro.siteId ? { siteId: filtro.siteId } : {}),
        ...(filtro.refType ? { refType: filtro.refType } : {}),
        ...(filtro.refId ? { refId: filtro.refId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
      select: {
        id: true,
        kind: true,
        quantity: true,
        balance: true,
        lot: true,
        reason: true,
        refType: true,
        createdAt: true,
        product: { select: { sku: true, name: true, unit: true } },
        site: { select: { code: true } },
        createdBy: { select: { firstName: true, lastName: true } },
      },
    });
  }

  /**
   * Recuenta el saldo desde el libro y devuelve las diferencias.
   *
   * La caché existe para que las consultas sean rápidas; esto es lo que
   * comprueba que no haya derivado. Se corre de vez en cuando, no en cada
   * consulta.
   */
  async verificarSaldos(siteId?: string) {
    const movimientos = await this.prisma.stockMovement.findMany({
      where: siteId ? { siteId } : {},
      select: { productId: true, siteId: true, lot: true, kind: true, quantity: true },
    });

    const libro = new Map<string, number>();
    for (const m of movimientos) {
      const clave = `${m.productId}|${m.siteId}|${m.lot}`;
      const delta = SUMAN.includes(m.kind) ? m.quantity : -m.quantity;
      libro.set(clave, (libro.get(clave) ?? 0) + delta);
    }

    const niveles = await this.prisma.stockLevel.findMany({
      where: siteId ? { siteId } : {},
      select: { productId: true, siteId: true, lot: true, quantity: true, product: { select: { sku: true, name: true } } },
    });

    const diferencias = niveles
      .map((n) => ({
        sku: n.product.sku,
        producto: n.product.name,
        lote: n.lot || null,
        saldo: n.quantity,
        segunLibro: libro.get(`${n.productId}|${n.siteId}|${n.lot}`) ?? 0,
      }))
      .filter((d) => d.saldo !== d.segunLibro);

    return { revisados: niveles.length, diferencias, cuadra: diferencias.length === 0 };
  }
}
