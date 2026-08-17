import type { InvoiceStatus, PaymentMethod, User } from '@prisma/client';
import type { Request } from 'express';
import { BillingService } from './billing.service';
declare class CrearDto {
    personId: string;
    siteId: string;
    payerId?: string;
    notes?: string;
}
declare class ItemDto {
    serviceId: string;
    quantity?: number;
    unitPrice?: number;
    discount?: number;
    appointmentId?: string;
}
declare class EmitirDto {
    diasPlazo: number;
}
declare class PagoDto {
    amount: number;
    method: PaymentMethod;
    reference?: string;
    notes?: string;
}
declare class AnularDto {
    motivo: string;
}
declare class RadicarDto {
    numero: string;
}
declare class GlosaDto {
    code: string;
    reason: string;
    amount: number;
}
declare class RespuestaGlosaDto {
    answer: string;
    acceptedAmount?: number;
}
export declare class BillingController {
    private readonly facturacion;
    constructor(facturacion: BillingService);
    private ctx;
    listar(status?: InvoiceStatus, personId?: string, payerId?: string, siteId?: string): Promise<{
        pagado: import("@prisma/client/runtime/library").Decimal;
        saldo: import("@prisma/client/runtime/library").Decimal;
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
        total: import("@prisma/client/runtime/library").Decimal;
        dueDate: Date | null;
        subtotal: import("@prisma/client/runtime/library").Decimal;
        discount: import("@prisma/client/runtime/library").Decimal;
        copay: import("@prisma/client/runtime/library").Decimal;
        issuedAt: Date | null;
        filedNumber: string | null;
        items: {
            id: string;
            total: import("@prisma/client/runtime/library").Decimal;
            description: string;
            quantity: number;
            unitPrice: import("@prisma/client/runtime/library").Decimal;
        }[];
        payments: {
            id: string;
            amount: import("@prisma/client/runtime/library").Decimal;
            method: import(".prisma/client").$Enums.PaymentMethod;
            reference: string | null;
            receivedAt: Date;
        }[];
        glosas: {
            id: string;
            status: import(".prisma/client").$Enums.GlosaStatus;
            reason: string;
            amount: import("@prisma/client/runtime/library").Decimal;
            code: string;
            acceptedAmount: import("@prisma/client/runtime/library").Decimal | null;
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
    crear(dto: CrearDto, user: User, req: Request): Promise<{
        number: string;
        id: string;
        status: import(".prisma/client").$Enums.InvoiceStatus;
    }>;
    agregarItem(id: string, dto: ItemDto, user: User, req: Request): Promise<{
        id: string;
        total: import("@prisma/client/runtime/library").Decimal;
        description: string;
    }>;
    quitarItem(itemId: string, user: User, req: Request): Promise<{
        number: string;
        id: string;
        total: import("@prisma/client/runtime/library").Decimal;
        subtotal: import("@prisma/client/runtime/library").Decimal;
        discount: import("@prisma/client/runtime/library").Decimal;
        copay: import("@prisma/client/runtime/library").Decimal;
    }>;
    emitir(id: string, dto: EmitirDto, user: User, req: Request): Promise<{
        number: string;
        id: string;
        status: import(".prisma/client").$Enums.InvoiceStatus;
        total: import("@prisma/client/runtime/library").Decimal;
        dueDate: Date | null;
    }>;
    anular(id: string, dto: AnularDto, user: User, req: Request): Promise<{
        number: string;
        id: string;
        status: import(".prisma/client").$Enums.InvoiceStatus;
    }>;
    pagar(id: string, dto: PagoDto, user: User, req: Request): Promise<{
        saldo: import("@prisma/client/runtime/library").Decimal;
        id: string;
        amount: import("@prisma/client/runtime/library").Decimal;
        method: import(".prisma/client").$Enums.PaymentMethod;
        receivedAt: Date;
    }>;
    radicar(id: string, dto: RadicarDto, user: User, req: Request): Promise<{
        number: string;
        id: string;
        personId: string;
        filedAt: Date | null;
        filedNumber: string | null;
    }>;
    glosa(id: string, dto: GlosaDto, user: User, req: Request): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.GlosaStatus;
        amount: import("@prisma/client/runtime/library").Decimal;
        code: string;
    }>;
    responderGlosa(glosaId: string, dto: RespuestaGlosaDto, user: User, req: Request): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.GlosaStatus;
        acceptedAmount: import("@prisma/client/runtime/library").Decimal | null;
    }>;
}
export {};
