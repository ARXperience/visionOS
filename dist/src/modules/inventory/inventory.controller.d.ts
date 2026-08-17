import type { ProductKind, StockMoveKind, User } from '@prisma/client';
import type { Request } from 'express';
import { InventoryService } from './inventory.service';
declare class ProductoDto {
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
}
declare class MovimientoDto {
    productId: string;
    siteId: string;
    kind: StockMoveKind;
    quantity: number;
    lot?: string;
    expiresAt?: string;
    reason?: string;
    unitCost?: number;
}
declare class TrasladoDto {
    productId: string;
    desdeSiteId: string;
    haciaSiteId: string;
    quantity: number;
    lot?: string;
    reason?: string;
}
export declare class InventoryController {
    private readonly inventario;
    constructor(inventario: InventoryService);
    private ctx;
    productos(kind?: ProductKind, buscar?: string, incluirInactivos?: string): import(".prisma/client").Prisma.PrismaPromise<{
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
        salePrice: import("@prisma/client/runtime/library").Decimal | null;
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
    crearProducto(dto: ProductoDto): import(".prisma/client").Prisma.Prisma__ProductClient<{
        name: string;
        id: string;
        kind: import(".prisma/client").$Enums.ProductKind;
        sku: string;
        tracksLot: boolean;
    }, never, import("@prisma/client/runtime/library").DefaultArgs, import(".prisma/client").Prisma.PrismaClientOptions>;
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
    movimientos(productId?: string, siteId?: string, refType?: string, refId?: string): import(".prisma/client").Prisma.PrismaPromise<{
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
    verificar(siteId?: string): Promise<{
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
    mover(dto: MovimientoDto, user: User, req: Request): Promise<{
        id: string;
        kind: import(".prisma/client").$Enums.StockMoveKind;
        quantity: number;
        lot: string;
        balance: number;
    }>;
    trasladar(dto: TrasladoDto, user: User, req: Request): Promise<{
        id: string;
        kind: import(".prisma/client").$Enums.StockMoveKind;
        quantity: number;
        lot: string;
        balance: number;
    }>;
}
export {};
