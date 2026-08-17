import type { ProfessionalType, User } from '@prisma/client';
import type { Request } from 'express';
import { ProfessionalsService } from './professionals.service';
declare class CrearDto {
    docNumber: string;
    firstName: string;
    lastName: string;
    type: ProfessionalType;
    licenseNumber?: string;
    specialties?: string[];
    color?: string;
    siteIds: string[];
}
declare class ServiciosDto {
    serviceIds: string[];
}
declare class FranjaDto {
    siteId: string;
    weekday: number;
    inicio: string;
    fin: string;
}
declare class BloqueoDto {
    siteId: string;
    desde: string;
    hasta: string;
    motivo: string;
}
declare class EstadoDto {
    activo: boolean;
}
export declare class ProfessionalsController {
    private readonly profesionales;
    constructor(profesionales: ProfessionalsService);
    private ctx;
    listar(): import(".prisma/client").Prisma.PrismaPromise<{
        id: string;
        docType: import(".prisma/client").$Enums.DocumentType;
        docNumber: string;
        displayName: string;
        type: import(".prisma/client").$Enums.ProfessionalType;
        licenseNumber: string | null;
        specialties: string[];
        color: string | null;
        isActive: boolean;
        sites: {
            site: {
                name: string;
                id: string;
                code: string;
            };
        }[];
        availabilities: {
            id: string;
            site: {
                id: string;
                code: string;
            };
            weekday: number;
            startMinute: number;
            endMinute: number;
        }[];
        services: {
            serviceId: string;
            durationMin: number | null;
        }[];
    }[]>;
    crear(dto: CrearDto, user: User, req: Request): Promise<{
        id: string;
        displayName: string;
    }>;
    servicios(id: string, dto: ServiciosDto, user: User, req: Request): Promise<{
        id: string;
        servicios: number;
    }>;
    franja(id: string, dto: FranjaDto, user: User, req: Request): Promise<{
        id: string;
        weekday: number;
        startMinute: number;
        endMinute: number;
    }>;
    quitarFranja(id: string, user: User, req: Request): Promise<{
        id: string;
        citasFuturasDelProfesional: number;
        aviso: string | null;
    }>;
    bloqueos(id: string): import(".prisma/client").Prisma.PrismaPromise<{
        id: string;
        site: {
            code: string;
        };
        startsAt: Date;
        endsAt: Date;
        blockReason: string | null;
    }[]>;
    bloquear(id: string, dto: BloqueoDto, user: User, req: Request): Promise<{
        id: string;
        startsAt: Date;
        endsAt: Date;
    }>;
    quitarBloqueo(id: string): import(".prisma/client").Prisma.Prisma__ResourceBookingClient<{
        id: string;
    }, never, import("@prisma/client/runtime/library").DefaultArgs, import(".prisma/client").Prisma.PrismaClientOptions>;
    estado(id: string, dto: EstadoDto, user: User, req: Request): Promise<{
        aviso: string | null;
        id: string;
        displayName: string;
        isActive: boolean;
    }>;
}
export {};
