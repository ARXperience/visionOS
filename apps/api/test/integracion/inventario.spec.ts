import { ConflictException } from '@nestjs/common';
import { PrismaClient, type User } from '@prisma/client';

import { AuditService } from '../../src/modules/audit/audit.service';
import { InventoryService } from '../../src/modules/inventory/inventory.service';
import type { PrismaService } from '../../src/prisma/prisma.service';

/**
 * El saldo de existencias es una caché del libro de movimientos. Lo que estas
 * pruebas defienden es que no puedan discrepar — ni cuando algo falla a
 * mitad de camino.
 */
const hayBase = Boolean(process.env.DATABASE_URL);
(hayBase ? describe : describe.skip)('inventario', () => {
  const prisma = new PrismaClient();
  const audit = new AuditService(prisma as unknown as PrismaService);
  const inv = new InventoryService(prisma as unknown as PrismaService, audit);

  const ctx = { actor: { id: null } as unknown as User };
  const marca = `TEST-${Date.now()}`;
  let productId: string;
  let sedeA: string;
  let sedeB: string;

  beforeAll(async () => {
    const sedes = await prisma.site.findMany({ select: { id: true }, take: 2 });
    sedeA = sedes[0].id;
    sedeB = sedes[1].id;
    const p = await inv.crearProducto({ sku: marca, name: `Producto ${marca}`, kind: 'INSUMO' });
    productId = p.id;
  });

  afterAll(async () => {
    // Los movimientos son append-only por trigger: se borra el producto y la
    // cascada se lleva los niveles. Los movimientos quedan, que es el punto.
    await prisma.stockMovement.deleteMany({ where: { productId } }).catch(() => undefined);
    await prisma.product.delete({ where: { id: productId } }).catch(() => undefined);
    await prisma.$disconnect();
  });

  it('no deja el saldo en negativo', async () => {
    await inv.mover({ productId, siteId: sedeA, kind: 'ENTRADA', quantity: 5 }, ctx);
    await expect(
      inv.mover({ productId, siteId: sedeA, kind: 'SALIDA', quantity: 6 }, ctx),
    ).rejects.toThrow(ConflictException);

    const n = await prisma.stockLevel.findFirst({ where: { productId, siteId: sedeA } });
    expect(n?.quantity).toBe(5);
  });

  it('un traslado que falla no deja la mercancía en el aire', async () => {
    // La salida de la sede A cabe, pero el conjunto debe fallar por la
    // cantidad. Si las dos mitades no fueran una sola transacción, la sede A
    // quedaría descontada y la B sin recibir nada.
    await expect(
      inv.trasladar({ productId, desdeSiteId: sedeA, haciaSiteId: sedeB, quantity: 99 }, ctx),
    ).rejects.toThrow(ConflictException);

    const a = await prisma.stockLevel.findFirst({ where: { productId, siteId: sedeA } });
    const b = await prisma.stockLevel.findFirst({ where: { productId, siteId: sedeB } });
    expect(a?.quantity).toBe(5);
    expect(b?.quantity ?? 0).toBe(0);
  });

  it('un traslado que sale bien conserva el total', async () => {
    await inv.trasladar({ productId, desdeSiteId: sedeA, haciaSiteId: sedeB, quantity: 2 }, ctx);

    const a = await prisma.stockLevel.findFirst({ where: { productId, siteId: sedeA } });
    const b = await prisma.stockLevel.findFirst({ where: { productId, siteId: sedeB } });
    expect(a?.quantity).toBe(3);
    expect(b?.quantity).toBe(2);
    expect((a?.quantity ?? 0) + (b?.quantity ?? 0)).toBe(5);
  });

  it('el saldo cuadra con el libro', async () => {
    const { diferencias } = await inv.verificarSaldos();
    expect(diferencias.filter((d) => d.sku === marca)).toEqual([]);
  });

  it('la cantidad siempre es positiva: el signo lo pone el tipo', async () => {
    await expect(
      inv.mover({ productId, siteId: sedeA, kind: 'ENTRADA', quantity: -3 }, ctx),
    ).rejects.toThrow();
    await expect(
      inv.mover({ productId, siteId: sedeA, kind: 'ENTRADA', quantity: 0 }, ctx),
    ).rejects.toThrow();
  });

  it('un lote vencido no se usa, pero sí se da de baja', async () => {
    const conLote = await inv.crearProducto({
      sku: `${marca}-LOTE`,
      name: `Con lote ${marca}`,
      kind: 'MEDICAMENTO',
      tracksLot: true,
    });

    await inv.mover(
      {
        productId: conLote.id,
        siteId: sedeA,
        kind: 'ENTRADA',
        quantity: 4,
        lot: 'X1',
        expiresAt: new Date('2020-01-01'),
      },
      ctx,
    );

    await expect(
      inv.mover({ productId: conLote.id, siteId: sedeA, kind: 'SALIDA', quantity: 1, lot: 'X1' }, ctx),
    ).rejects.toThrow(ConflictException);

    // Darlo de baja es justo lo que hay que hacer con él.
    const baja = await inv.mover(
      { productId: conLote.id, siteId: sedeA, kind: 'BAJA', quantity: 4, lot: 'X1', reason: 'vencido' },
      ctx,
    );
    expect(baja.balance).toBe(0);

    await prisma.stockMovement.deleteMany({ where: { productId: conLote.id } }).catch(() => undefined);
    await prisma.product.delete({ where: { id: conLote.id } }).catch(() => undefined);
  });
});
