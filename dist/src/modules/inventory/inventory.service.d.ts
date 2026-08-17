import { Prisma, type ProductKind, type StockMoveKind, type User } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
interface Ctx {
    actor: User;
    ip?: string | null;
}
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
export declare class InventoryService {
    private readonly prisma;
    private readonly audit;
    constructor(prisma: PrismaService, audit: AuditService);
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
    }): Prisma.Prisma__ProductClient<{
        name: string;
        id: string;
        kind: import(".prisma/client").$Enums.ProductKind;
        sku: string;
        tracksLot: boolean;
    }, never, import("@prisma/client/runtime/library").DefaultArgs, Prisma.PrismaClientOptions>;
    productos(filtro: {
        kind?: ProductKind;
        buscar?: string;
        soloActivos?: boolean;
    }): Prisma.PrismaPromise<{
        name: string;
        id: string;
        kind: import(".prisma/client").$Enums.ProductKind;
        isActive: boolean;
        sku: string;
        brand: string | null;
        model: string | null;
        unit: string;
        invima: string | null;
        tracksLot: boolean;
        minQty: number;
        salePrice: Prisma.Decimal | null;
        levels: {
            site: {
                code: string;
            };
            siteId: string;
            expiresAt: Date | null;
            quantity: number;
            minQty: number | null;
            lot: string;
        }[];
    }[]>;
    mover(datos: Movimiento, ctx: Ctx): Promise<{
        id: string;
        kind: import(".prisma/client").$Enums.StockMoveKind;
        quantity: number;
        lot: string;
        balance: number;
    }>;
    private moverEn;
    trasladar(datos: {
        productId: string;
        desdeSiteId: string;
        haciaSiteId: string;
        quantity: number;
        lot?: string;
        reason?: string;
    }, ctx: Ctx): Promise<{
        id: string;
        kind: import(".prisma/client").$Enums.StockMoveKind;
        quantity: number;
        lot: string;
        balance: number;
    }>;
    alertas(siteId?: string): Promise<{
        bajoMinimo: {
            producto: string;
            sku: string;
            sede: string;
            hay: number;
            minimo: number;
        }[];
        vencidos: {
            producto: string;
            sku: string;
            sede: string;
            lote: string | null;
            cantidad: number;
            vence: string | null;
        }[];
        porVencer: {
            producto: string;
            sku: string;
            sede: string;
            lote: string | null;
            cantidad: number;
            vence: string | null;
        }[];
    }>;
    movimientos(filtro: {
        productId?: string;
        siteId?: string;
        refType?: string;
        refId?: string;
    }): Prisma.PrismaPromise<{
        id: string;
        createdAt: Date;
        site: {
            code: string;
        };
        product: {
            name: string;
            sku: string;
            unit: string;
        };
        kind: import(".prisma/client").$Enums.StockMoveKind;
        createdBy: {
            firstName: string;
            lastName: string;
        } | null;
        reason: string | null;
        quantity: number;
        lot: string;
        balance: number;
        refType: string | null;
    }[]>;
    verificarSaldos(siteId?: string): Promise<{
        revisados: number;
        diferencias: {
            sku: string;
            producto: string;
            lote: string | null;
            saldo: number;
            segunLibro: number;
        }[];
        cuadra: boolean;
    }>;
}
export {};
