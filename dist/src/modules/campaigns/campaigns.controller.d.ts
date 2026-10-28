import type { User } from '@prisma/client';
import type { Request } from 'express';
import { CampaignsService } from './campaigns.service';
declare const ESTADOS: readonly ["PLANEADA", "CONFIRMADA", "EJECUTADA", "CANCELADA"];
declare class EmpresaDto {
    nit: string;
    name: string;
    contactName?: string;
    contactPhone?: string;
    contactEmail?: string;
    address?: string;
}
declare class CampanaDto {
    companyId: string;
    siteId?: string;
    name: string;
    scheduledAt: string;
    location?: string;
    expectedPeople?: number;
    notes?: string;
}
declare class ParticipanteDto {
    documento: string;
    nombre: string;
    apellido?: string;
    telefono?: string;
    finding?: string;
    needsFollowUp?: boolean;
}
declare class EstadoDto {
    status: (typeof ESTADOS)[number];
}
export declare class CampaignsController {
    private readonly campanas;
    constructor(campanas: CampaignsService);
    private ctx;
    empresas(): import(".prisma/client").Prisma.PrismaPromise<{
        name: string;
        id: string;
        _count: {
            campaigns: number;
        };
        nit: string;
        contactName: string | null;
        contactPhone: string | null;
    }[]>;
    crearEmpresa(dto: EmpresaDto): Promise<{
        name: string;
        id: string;
        nit: string;
    }>;
    listar(status?: string): Promise<{
        atendidos: number;
        asistencia: number | null;
        requierenValoracion: number;
        yaAgendados: number;
        sinAgendar: number;
        name: string;
        id: string;
        status: import(".prisma/client").$Enums.CampaignStatus;
        site: {
            code: string;
        } | null;
        company: {
            name: string;
            id: string;
            contactName: string | null;
            contactPhone: string | null;
        };
        notes: string | null;
        scheduledAt: Date;
        location: string | null;
        expectedPeople: number | null;
        participants: {
            id: string;
            person: {
                id: string;
                phone: string | null;
                displayName: string;
                appointments: {
                    id: string;
                    startsAt: Date;
                }[];
            };
            finding: string | null;
            needsFollowUp: boolean;
        }[];
    }[]>;
    pendientes(): Promise<{
        personId: string;
        paciente: string;
        telefono: string | null;
        hallazgo: string | null;
        empresa: string;
        jornada: string;
        diasDesde: number;
    }[]>;
    crear(dto: CampanaDto, user: User, req: Request): Promise<{
        name: string;
        id: string;
        status: import(".prisma/client").$Enums.CampaignStatus;
        scheduledAt: Date;
    }>;
    registrar(id: string, dto: ParticipanteDto, user: User, req: Request): Promise<{
        persona: {
            id: string;
            displayName: string;
        };
        id: string;
        needsFollowUp: boolean;
    }>;
    estado(id: string, dto: EstadoDto, user: User, req: Request): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.CampaignStatus;
        siteId: string | null;
    }>;
}
export {};
