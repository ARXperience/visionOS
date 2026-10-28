import type { LeadStatus, User } from '@prisma/client';
import type { Request } from 'express';
import { LeadsService } from './leads.service';
declare class AsignarDto {
    userId?: string;
}
declare class CotizarDto {
    amount: number;
    serviceId?: string;
    nota?: string;
}
declare class PerderDto {
    motivo: string;
}
export declare class LeadsController {
    private readonly leads;
    constructor(leads: LeadsService);
    private ctx;
    listar(status?: LeadStatus, assignedToId?: string, siteId?: string, sinTocar?: string): Promise<{
        tieneCita: boolean;
        horasSinTocar: number;
        id: string;
        status: import(".prisma/client").$Enums.LeadStatus;
        createdAt: Date;
        updatedAt: Date;
        site: {
            code: string;
        } | null;
        person: {
            id: string;
            phone: string | null;
            displayName: string;
            appointments: {
                id: string;
                status: import(".prisma/client").$Enums.AppointmentStatus;
                startsAt: Date;
            }[];
        };
        conversation: {
            id: string;
        } | null;
        assignedTo: {
            id: string;
            firstName: string;
            lastName: string;
        } | null;
        source: import(".prisma/client").$Enums.ChannelProvider;
        interestText: string | null;
        quotedAmount: import("@prisma/client/runtime/library").Decimal | null;
        quotedAt: Date | null;
        lostReason: string | null;
        convertedAt: Date | null;
        interestService: {
            name: string;
            id: string;
        } | null;
    }[]>;
    embudo(desde?: string, hasta?: string): Promise<{
        total: number;
        porEstado: {
            [k: string]: number;
        };
        porOrigen: {
            [k: string]: number;
        };
        convertidos: number;
        tasaConversion: number | null;
        diasHastaConvertir: number | null;
        valorCotizado: string;
        sinTocar: number;
        motivosDePerdida: {
            motivo: string;
            veces: number;
        }[];
        conciliadosAhora: number;
    }>;
    asignar(id: string, dto: AsignarDto, user: User, req: Request): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.LeadStatus;
        personId: string;
    }>;
    cotizar(id: string, dto: CotizarDto, user: User, req: Request): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.LeadStatus;
        siteId: string | null;
        personId: string;
        quotedAmount: import("@prisma/client/runtime/library").Decimal | null;
    }>;
    perder(id: string, dto: PerderDto, user: User, req: Request): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.LeadStatus;
        lostReason: string | null;
    }>;
}
export {};
