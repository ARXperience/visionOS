import { Prisma, type ProfessionalType, type User } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
interface Ctx {
    actor: User;
    ip?: string | null;
}
export declare class ProfessionalsService {
    private readonly prisma;
    private readonly audit;
    constructor(prisma: PrismaService, audit: AuditService);
    listar(): Prisma.PrismaPromise<{
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
    crear(datos: {
        docNumber: string;
        firstName: string;
        lastName: string;
        type: ProfessionalType;
        licenseNumber?: string;
        specialties?: string[];
        color?: string;
        siteIds: string[];
    }, ctx: Ctx): Promise<{
        id: string;
        displayName: string;
    }>;
    asignarServicios(id: string, serviceIds: string[], ctx: Ctx): Promise<{
        id: string;
        servicios: number;
    }>;
    agregarFranja(datos: {
        professionalId: string;
        siteId: string;
        weekday: number;
        inicio: string;
        fin: string;
    }, ctx: Ctx): Promise<{
        id: string;
        weekday: number;
        startMinute: number;
        endMinute: number;
    }>;
    quitarFranja(id: string, ctx: Ctx): Promise<{
        id: string;
        citasFuturasDelProfesional: number;
        aviso: string | null;
    }>;
    bloquear(datos: {
        professionalId: string;
        siteId: string;
        desde: string;
        hasta: string;
        motivo: string;
    }, ctx: Ctx): Promise<{
        id: string;
        startsAt: Date;
        endsAt: Date;
    }>;
    bloqueos(professionalId: string): Prisma.PrismaPromise<{
        id: string;
        site: {
            code: string;
        };
        startsAt: Date;
        endsAt: Date;
        blockReason: string | null;
    }[]>;
    quitarBloqueo(id: string): Prisma.Prisma__ResourceBookingClient<{
        id: string;
    }, never, import("@prisma/client/runtime/library").DefaultArgs, Prisma.PrismaClientOptions>;
    cambiarEstado(id: string, activo: boolean, ctx: Ctx): Promise<{
        aviso: string | null;
        id: string;
        displayName: string;
        isActive: boolean;
    }>;
}
export {};
