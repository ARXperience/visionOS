import type { User } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
interface Ctx {
    actor: User;
    ip?: string | null;
}
export declare class FollowupService {
    private readonly prisma;
    private readonly audit;
    constructor(prisma: PrismaService, audit: AuditService);
    anotar(datos: {
        personId: string;
        siteId: string;
        serviceId: string;
        professionalId?: string;
        preferredFrom?: Date;
        preferredTo?: Date;
        priority?: number;
        notes?: string;
    }, ctx: Ctx): Promise<{
        id: string;
        createdAt: Date;
        priority: number;
    }>;
    espera(filtro: {
        siteId?: string;
        serviceId?: string;
    }): Promise<{
        diasEsperando: number;
        id: string;
        createdAt: Date;
        site: {
            code: string;
        };
        service: {
            name: string;
            id: string;
        };
        person: {
            id: string;
            phone: string | null;
            displayName: string;
        };
        notes: string | null;
        preferredFrom: Date | null;
        preferredTo: Date | null;
        priority: number;
        notifiedAt: Date | null;
    }[]>;
    marcarOfrecido(id: string, ctx: Ctx): Promise<{
        id: string;
        personId: string;
        notifiedAt: Date | null;
    }>;
    retirar(id: string, motivo: string | undefined, ctx: Ctx): Promise<{
        id: string;
        isActive: boolean;
    }>;
    controlesPendientes(meses?: number, siteId?: string): Promise<{
        personId: string;
        paciente: string;
        telefono: string | null;
        ultimaAtencion: string;
        mesesSinVolver: number;
        servicio: string;
        linea: import(".prisma/client").$Enums.BusinessLine;
        sede: string;
    }[]>;
    resumen(siteId?: string): Promise<{
        enEspera: number;
        ofrecidosSinRespuesta: number;
        controlesPendientes: number;
    }>;
}
export {};
