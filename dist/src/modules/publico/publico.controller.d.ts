import type { PqrsfTipo } from '@prisma/client';
import type { Request } from 'express';
import { PqrsfService } from '../pqrsf/pqrsf.service';
import { PublicoService } from './publico.service';
declare class SolicitudDto {
    nombre: string;
    telefono: string;
    correo?: string;
    autorizacion: boolean;
    sede?: string;
    servicio?: string;
    mensaje?: string;
    nit?: string;
}
declare class PqrsfDto {
    tipo: PqrsfTipo;
    nombre: string;
    contacto: string;
    asunto: string;
    detalle: string;
    nit?: string;
}
export declare class PublicoController {
    private readonly publico;
    private readonly pqrsf;
    constructor(publico: PublicoService, pqrsf: PqrsfService);
    sedes(): import(".prisma/client").Prisma.PrismaPromise<{
        name: string;
        phone: string | null;
        address: string;
        code: string;
        city: string;
        openingHours: import("@prisma/client/runtime/library").JsonValue;
    }[]>;
    servicios(): Promise<{
        linea: string;
        servicios: {
            name: string;
            slug: string;
            businessLine: import(".prisma/client").$Enums.BusinessLine;
            durationMin: number;
            requiresReferral: boolean;
            requiresAuthorization: boolean;
            requiresDilation: boolean;
            requiresCompanion: boolean;
        }[];
    }[]>;
    solicitar(dto: SolicitudDto, req: Request): Promise<{
        radicado: string;
        mensaje: string;
    }> | {
        radicado: null;
        mensaje: string;
    };
    radicarPqrsf(dto: PqrsfDto, req: Request): Promise<{
        radicado: string;
        dueDate: null;
    } | {
        radicado: string;
        dueDate: Date;
    }>;
}
export {};
