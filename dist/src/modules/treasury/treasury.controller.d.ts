import type { User } from '@prisma/client';
import type { Request } from 'express';
import { TreasuryService } from './treasury.service';
declare class CerrarDto {
    siteId: string;
    fecha: string;
    countedCash: number;
    openingFloat?: number;
    notes?: string;
}
export declare class TreasuryController {
    private readonly tesoreria;
    constructor(tesoreria: TreasuryService);
    esperado(siteId: string, fecha?: string): Promise<{
        fecha: string;
        efectivo: import("@prisma/client/runtime/library").Decimal;
        tarjeta: import("@prisma/client/runtime/library").Decimal;
        transferencia: import("@prisma/client/runtime/library").Decimal;
        otros: import("@prisma/client/runtime/library").Decimal;
        total: import("@prisma/client/runtime/library").Decimal;
        movimientos: number;
        detalle: {
            hora: string;
            factura: string;
            paciente: string;
            medio: import(".prisma/client").$Enums.PaymentMethod;
            referencia: string | null;
            valor: string;
        }[];
    }>;
    historico(siteId?: string, dias?: string): Promise<{
        cierres: {
            id: string;
            site: {
                code: string;
            };
            notes: string | null;
            date: Date;
            expectedCash: import("@prisma/client/runtime/library").Decimal;
            countedCash: import("@prisma/client/runtime/library").Decimal;
            difference: import("@prisma/client/runtime/library").Decimal;
            expectedCard: import("@prisma/client/runtime/library").Decimal;
            expectedTransfer: import("@prisma/client/runtime/library").Decimal;
            closedBy: {
                firstName: string;
                lastName: string;
            } | null;
        }[];
        diasConDescuadre: number;
        sumaDescuadres: string;
        faltantes: string;
    }>;
    sinCerrar(siteId?: string): Promise<{
        sede: string;
        fecha: string;
        siteId: string;
    }[]>;
    cerrar(dto: CerrarDto, user: User, req: Request): Promise<{
        cuadra: boolean;
        mensaje: string;
        id: string;
        date: Date;
        expectedCash: import("@prisma/client/runtime/library").Decimal;
        countedCash: import("@prisma/client/runtime/library").Decimal;
        difference: import("@prisma/client/runtime/library").Decimal;
    }>;
}
export {};
