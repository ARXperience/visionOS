import { Prisma, type InvoiceStatus, type PaymentMethod, type User } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
interface Ctx {
    actor: User;
    ip?: string | null;
}
export declare class BillingService {
    private readonly prisma;
    private readonly audit;
    constructor(prisma: PrismaService, audit: AuditService);
    private siguienteNumero;
    private tarifa;
    crear(datos: {
        personId: string;
        siteId: string;
        payerId?: string;
        notes?: string;
    }, ctx: Ctx): Promise<{
        number: string;
        id: string;
        status: import(".prisma/client").$Enums.InvoiceStatus;
    }>;
    agregarItem(invoiceId: string, datos: {
        serviceId: string;
        quantity?: number;
        unitPrice?: number;
        discount?: number;
        appointmentId?: string;
    }, ctx: Ctx): Promise<{
        id: string;
        total: Prisma.Decimal;
        description: string;
    }>;
    quitarItem(itemId: string, ctx: Ctx): Promise<{
        number: string;
        id: string;
        total: Prisma.Decimal;
        subtotal: Prisma.Decimal;
        discount: Prisma.Decimal;
        copay: Prisma.Decimal;
    }>;
    private recalcular;
    emitir(id: string, diasPlazo: number, ctx: Ctx): Promise<{
        number: string;
        id: string;
        status: import(".prisma/client").$Enums.InvoiceStatus;
        total: Prisma.Decimal;
        dueDate: Date | null;
    }>;
    anular(id: string, motivo: string, ctx: Ctx): Promise<{
        number: string;
        id: string;
        status: import(".prisma/client").$Enums.InvoiceStatus;
    }>;
    registrarPago(invoiceId: string, datos: {
        amount: number;
        method: PaymentMethod;
        reference?: string;
        notes?: string;
    }, ctx: Ctx): Promise<{
        saldo: Prisma.Decimal;
        id: string;
        amount: Prisma.Decimal;
        method: import(".prisma/client").$Enums.PaymentMethod;
        receivedAt: Date;
    }>;
    radicar(id: string, numero: string, ctx: Ctx): Promise<{
        number: string;
        id: string;
        personId: string;
        filedAt: Date | null;
        filedNumber: string | null;
    }>;
    registrarGlosa(invoiceId: string, datos: {
        code: string;
        reason: string;
        amount: number;
    }, ctx: Ctx): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.GlosaStatus;
        amount: Prisma.Decimal;
        code: string;
    }>;
    responderGlosa(id: string, datos: {
        answer: string;
        acceptedAmount?: number;
    }, ctx: Ctx): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.GlosaStatus;
        acceptedAmount: Prisma.Decimal | null;
    }>;
    listar(filtro: {
        status?: InvoiceStatus;
        personId?: string;
        payerId?: string;
        siteId?: string;
    }): Promise<{
        pagado: Prisma.Decimal;
        saldo: Prisma.Decimal;
        number: string;
        id: string;
        status: import(".prisma/client").$Enums.InvoiceStatus;
        createdAt: Date;
        site: {
            code: string;
        };
        person: {
            id: string;
            docNumber: string | null;
            displayName: string;
        };
        payer: {
            name: string;
            id: string;
        } | null;
        total: Prisma.Decimal;
        dueDate: Date | null;
        subtotal: Prisma.Decimal;
        discount: Prisma.Decimal;
        copay: Prisma.Decimal;
        issuedAt: Date | null;
        filedNumber: string | null;
        items: {
            id: string;
            total: Prisma.Decimal;
            description: string;
            quantity: number;
            unitPrice: Prisma.Decimal;
        }[];
        payments: {
            id: string;
            amount: Prisma.Decimal;
            method: import(".prisma/client").$Enums.PaymentMethod;
            reference: string | null;
            receivedAt: Date;
        }[];
        glosas: {
            id: string;
            status: import(".prisma/client").$Enums.GlosaStatus;
            reason: string;
            amount: Prisma.Decimal;
            code: string;
            acceptedAmount: Prisma.Decimal | null;
        }[];
    }[]>;
    cartera(payerId?: string): Promise<{
        tramos: {
            [k: string]: string;
        };
        total: string;
        enGlosa: string;
        porPagador: {
            saldo: string;
            nombre: string;
            facturas: number;
        }[];
        detalle: {
            id: string;
            numero: string;
            pagador: string;
            paciente: string;
            saldo: string;
            diasVencida: number;
        }[];
    }>;
}
export {};
