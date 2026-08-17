"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InventoryService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../../prisma/prisma.service");
const audit_service_1 = require("../audit/audit.service");
const SUMAN = ['ENTRADA', 'TRASLADO_ENTRADA'];
let InventoryService = class InventoryService {
    prisma;
    audit;
    constructor(prisma, audit) {
        this.prisma = prisma;
        this.audit = audit;
    }
    crearProducto(datos) {
        return this.prisma.product.create({
            data: {
                ...datos,
                sku: datos.sku.trim().toUpperCase(),
                salePrice: datos.salePrice !== undefined ? new client_1.Prisma.Decimal(datos.salePrice) : undefined,
                costPrice: datos.costPrice !== undefined ? new client_1.Prisma.Decimal(datos.costPrice) : undefined,
            },
            select: { id: true, sku: true, name: true, kind: true, tracksLot: true },
        });
    }
    productos(filtro) {
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
    async mover(datos, ctx) {
        return this.prisma.$transaction((tx) => this.moverEn(tx, datos, ctx));
    }
    async moverEn(tx, datos, ctx) {
        if (!Number.isInteger(datos.quantity) || datos.quantity <= 0) {
            throw new common_1.BadRequestException('La cantidad es siempre positiva: el signo lo da el tipo de movimiento.');
        }
        const producto = await tx.product.findUnique({
            where: { id: datos.productId },
            select: { id: true, name: true, tracksLot: true, isActive: true },
        });
        if (!producto)
            throw new common_1.NotFoundException('Producto no encontrado');
        const lote = (datos.lot ?? '').trim();
        if (producto.tracksLot && datos.kind === 'ENTRADA') {
            if (!lote) {
                throw new common_1.BadRequestException(`"${producto.name}" exige lote: sin él no se puede retirar del mercado ni rastrear cuando algo sale mal.`);
            }
            if (!datos.expiresAt) {
                throw new common_1.BadRequestException(`"${producto.name}" exige fecha de vencimiento.`);
            }
        }
        if (!producto.isActive && datos.kind !== 'AJUSTE' && datos.kind !== 'BAJA') {
            throw new common_1.BadRequestException('El producto está inactivo: solo se puede ajustar o dar de baja.');
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
                throw new common_1.ConflictException(`No hay existencias suficientes de "${producto.name}"${lote ? ` (lote ${lote})` : ''}: hay ${actual} y se piden ${datos.quantity}.`);
            }
            if (!suma && datos.kind !== 'BAJA' && nivel?.expiresAt && nivel.expiresAt < new Date()) {
                throw new common_1.ConflictException(`El lote ${lote} venció el ${nivel.expiresAt.toISOString().slice(0, 10)}. Dese de baja en vez de usarlo.`);
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
                    unitCost: datos.unitCost !== undefined ? new client_1.Prisma.Decimal(datos.unitCost) : undefined,
                    createdById: ctx.actor.id,
                },
                select: { id: true, kind: true, quantity: true, balance: true, lot: true },
            });
            return mov;
        }
    }
    async trasladar(datos, ctx) {
        if (datos.desdeSiteId === datos.haciaSiteId) {
            throw new common_1.BadRequestException('El origen y el destino son la misma sede.');
        }
        const lote = (datos.lot ?? '').trim();
        return this.prisma.$transaction(async (tx) => {
            const origen = await tx.stockLevel.findUnique({
                where: { productId_siteId_lot: { productId: datos.productId, siteId: datos.desdeSiteId, lot: lote } },
                select: { expiresAt: true },
            });
            await this.moverEn(tx, {
                productId: datos.productId,
                siteId: datos.desdeSiteId,
                kind: 'TRASLADO_SALIDA',
                quantity: datos.quantity,
                lot: lote,
                reason: datos.reason,
            }, ctx);
            return this.moverEn(tx, {
                productId: datos.productId,
                siteId: datos.haciaSiteId,
                kind: 'TRASLADO_ENTRADA',
                quantity: datos.quantity,
                lot: lote,
                expiresAt: origen?.expiresAt ?? undefined,
                reason: datos.reason,
            }, ctx);
        });
    }
    async alertas(siteId) {
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
        const porProducto = new Map();
        const vencidos = [];
        const porVencer = [];
        for (const n of niveles) {
            const clave = `${n.product.id}:${n.site.id}`;
            const minimo = n.minQty ?? n.product.minQty;
            const previo = porProducto.get(clave) ?? { producto: n.product, sede: n.site.code, total: 0, minimo };
            porProducto.set(clave, { ...previo, total: previo.total + n.quantity, minimo });
            if (n.expiresAt && n.quantity > 0) {
                if (n.expiresAt < new Date())
                    vencidos.push(n);
                else if (n.expiresAt <= en30)
                    porVencer.push(n);
            }
        }
        const bajoMinimo = [...porProducto.values()].filter((p) => p.minimo > 0 && p.total <= p.minimo);
        const formato = (n) => ({
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
    movimientos(filtro) {
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
    async verificarSaldos(siteId) {
        const movimientos = await this.prisma.stockMovement.findMany({
            where: siteId ? { siteId } : {},
            select: { productId: true, siteId: true, lot: true, kind: true, quantity: true },
        });
        const libro = new Map();
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
};
exports.InventoryService = InventoryService;
exports.InventoryService = InventoryService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService])
], InventoryService);
//# sourceMappingURL=inventory.service.js.map