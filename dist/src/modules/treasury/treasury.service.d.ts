import { Prisma, type User } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
interface Ctx {
    actor: User;
    ip?: string | null;
}
export declare class TreasuryService {
    private readonly prisma;
    private readonly audit;
    constructor(prisma: PrismaService, audit: AuditService);
    esperado(siteId: string, dia: string): Promise<{
        fecha: string;
        efectivo: Prisma.Decimal;
        tarjeta: Prisma.Decimal;
        transferencia: Prisma.Decimal;
        otros: Prisma.Decimal;
        total: Prisma.Decimal;
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
    cerrar(datos: {
        siteId: string;
        fecha: string;
        countedCash: number;
        openingFloat?: number;
        notes?: string;
    }, ctx: Ctx): Promise<{
        cuadra: boolean;
        mensaje: string;
        id: string;
        date: Date;
        expectedCash: Prisma.Decimal;
        countedCash: Prisma.Decimal;
        difference: Prisma.Decimal;
    }>;
    historico(siteId?: string, dias?: number): Promise<{
        cierres: {
            id: string;
            site: {
                code: string;
            };
            notes: string | null;
            date: Date;
            expectedCash: Prisma.Decimal;
            countedCash: Prisma.Decimal;
            difference: Prisma.Decimal;
            expectedCard: Prisma.Decimal;
            expectedTransfer: Prisma.Decimal;
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
}
export {};
