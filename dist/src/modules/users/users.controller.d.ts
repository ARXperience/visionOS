import type { User, UserRole } from '@prisma/client';
import type { Request } from 'express';
import { UsersService } from './users.service';
declare class CrearUsuarioDto {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
    role: UserRole;
    siteIds: string[];
    crossSitePatientRead?: boolean;
}
declare class ActualizarUsuarioDto {
    firstName?: string;
    lastName?: string;
    phone?: string;
    role?: UserRole;
    crossSitePatientRead?: boolean;
    siteIds?: string[];
}
declare class ClaveDto {
    password: string;
}
declare class EstadoDto {
    activo: boolean;
}
export declare class UsersController {
    private readonly usuarios;
    constructor(usuarios: UsersService);
    private ctx;
    roles(): {
        role: "SUPERADMIN" | "ADMIN_SEDE" | "COORDINACION" | "RECEPCION" | "AGENDAMIENTO" | "CALL_CENTER" | "PROFESIONAL" | "FACTURACION" | "AUDITOR";
        permisos: number;
        detalle: ("user.read" | "user.manage" | "site.read" | "site.manage" | "service.read" | "service.manage" | "audit.read" | "settings.manage" | "patient.read" | "patient.write" | "patient.read_cross_site" | "patient.merge" | "patient.export" | "appointment.read" | "appointment.write" | "appointment.cancel" | "appointment.overbook" | "appointment.checkin" | "schedule.manage" | "waitlist.manage" | "conversation.read" | "conversation.write" | "conversation.assign" | "whatsapp.manage" | "lead.read" | "lead.write" | "ai.toggle" | "ai.configure" | "dashboard.read" | "dashboard.read_all_sites")[];
    }[];
    listar(): import(".prisma/client").Prisma.PrismaPromise<{
        id: string;
        email: string;
        firstName: string;
        lastName: string;
        phone: string | null;
        role: import(".prisma/client").$Enums.UserRole;
        status: import(".prisma/client").$Enums.UserStatus;
        crossSitePatientRead: boolean;
        lastLoginAt: Date | null;
        createdAt: Date;
        siteAccess: {
            site: {
                id: string;
                code: string;
            };
            isPrimary: boolean;
        }[];
    }[]>;
    crear(dto: CrearUsuarioDto, user: User, req: Request): Promise<{
        id: string;
        email: string;
        role: import(".prisma/client").$Enums.UserRole;
    }>;
    actualizar(id: string, dto: ActualizarUsuarioDto, user: User, req: Request): Promise<{
        id: string;
        email: string;
        role: import(".prisma/client").$Enums.UserRole;
    }>;
    clave(id: string, dto: ClaveDto, user: User, req: Request): Promise<{
        id: string;
        email: string;
    }>;
    estado(id: string, dto: EstadoDto, user: User, req: Request): Promise<{
        id: string;
        status: string;
    }>;
    baja(id: string, user: User, req: Request): Promise<{
        id: string;
        email: string;
        baja: boolean;
    }>;
}
export {};
