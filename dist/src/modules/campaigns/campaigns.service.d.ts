import type { User } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
interface Ctx {
    actor: User;
    ip?: string | null;
}
export declare class CampaignsService {
    private readonly prisma;
    private readonly audit;
    constructor(prisma: PrismaService, audit: AuditService);
    crearEmpresa(datos: {
        nit: string;
        name: string;
        contactName?: string;
        contactPhone?: string;
        contactEmail?: string;
        address?: string;
    }): Promise<{
        name: string;
        id: string;
        nit: string;
    }>;
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
    crear(datos: {
        companyId: string;
        siteId?: string;
        name: string;
        scheduledAt: Date;
        location?: string;
        expectedPeople?: number;
        notes?: string;
    }, ctx: Ctx): Promise<{
        name: string;
        id: string;
        status: import(".prisma/client").$Enums.CampaignStatus;
        scheduledAt: Date;
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
    registrar(campaignId: string, datos: {
        documento: string;
        nombre: string;
        apellido?: string;
        telefono?: string;
        finding?: string;
        needsFollowUp?: boolean;
    }, ctx: Ctx): Promise<{
        persona: {
            id: string;
            displayName: string;
        };
        id: string;
        needsFollowUp: boolean;
    }>;
    cambiarEstado(id: string, status: 'PLANEADA' | 'CONFIRMADA' | 'EJECUTADA' | 'CANCELADA', ctx: Ctx): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.CampaignStatus;
        siteId: string | null;
    }>;
    pendientesDeLlamar(): Promise<{
        personId: string;
        paciente: string;
        telefono: string | null;
        hallazgo: string | null;
        empresa: string;
        jornada: string;
        diasDesde: number;
    }[]>;
}
export {};
