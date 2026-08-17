import { Prisma, type UserRole, type User } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
interface Ctx {
    actor: User;
    ip?: string | null;
}
export declare class UsersService {
    private readonly prisma;
    private readonly audit;
    constructor(prisma: PrismaService, audit: AuditService);
    listar(): Prisma.PrismaPromise<{
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
    crear(datos: {
        email: string;
        password: string;
        firstName: string;
        lastName: string;
        phone?: string;
        role: UserRole;
        siteIds: string[];
        crossSitePatientRead?: boolean;
    }, ctx: Ctx): Promise<{
        id: string;
        email: string;
        role: import(".prisma/client").$Enums.UserRole;
    }>;
    cambiarClave(id: string, password: string, ctx: Ctx): Promise<{
        id: string;
        email: string;
    }>;
    actualizar(id: string, datos: {
        firstName?: string;
        lastName?: string;
        phone?: string | null;
        role?: UserRole;
        crossSitePatientRead?: boolean;
        siteIds?: string[];
    }, ctx: Ctx): Promise<{
        id: string;
        email: string;
        role: import(".prisma/client").$Enums.UserRole;
    }>;
    cambiarEstado(id: string, activo: boolean, ctx: Ctx): Promise<{
        id: string;
        status: string;
    }>;
    darDeBaja(id: string, ctx: Ctx): Promise<{
        id: string;
        email: string;
        baja: boolean;
    }>;
    private protegerUltimoAdmin;
}
export {};
