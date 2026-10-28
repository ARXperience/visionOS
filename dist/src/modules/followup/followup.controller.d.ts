import type { User } from '@prisma/client';
import type { Request } from 'express';
import { FollowupService } from './followup.service';
declare class AnotarDto {
    personId: string;
    siteId: string;
    serviceId: string;
    professionalId?: string;
    preferredFrom?: string;
    preferredTo?: string;
    priority?: number;
    notes?: string;
}
declare class RetirarDto {
    motivo?: string;
}
export declare class FollowupController {
    private readonly seguimiento;
    constructor(seguimiento: FollowupService);
    private ctx;
    resumen(siteId?: string): Promise<{
        enEspera: number;
        ofrecidosSinRespuesta: number;
        controlesPendientes: number;
    }>;
    espera(siteId?: string, serviceId?: string): Promise<{
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
    controles(meses?: string, siteId?: string): Promise<{
        personId: string;
        paciente: string;
        telefono: string | null;
        ultimaAtencion: string;
        mesesSinVolver: number;
        servicio: string;
        linea: import(".prisma/client").$Enums.BusinessLine;
        sede: string;
    }[]>;
    anotar(dto: AnotarDto, user: User, req: Request): Promise<{
        id: string;
        createdAt: Date;
        priority: number;
    }>;
    ofrecido(id: string, user: User, req: Request): Promise<{
        id: string;
        personId: string;
        notifiedAt: Date | null;
    }>;
    retirar(id: string, dto: RetirarDto, user: User, req: Request): Promise<{
        id: string;
        isActive: boolean;
    }>;
}
export {};
