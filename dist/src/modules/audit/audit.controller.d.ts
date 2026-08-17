import type { Prisma, User } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from './audit.service';
export declare class AuditController {
    private readonly prisma;
    private readonly audit;
    constructor(prisma: PrismaService, audit: AuditService);
    listar(accion?: string, personId?: string, userId?: string, entidad?: string, desde?: string, hasta?: string, pagina?: string): Promise<{
        total: number;
        pagina: number;
        porPagina: number;
        filas: {
            user: {
                email: string;
                firstName: string;
                lastName: string;
            } | null;
            id: string;
            createdAt: Date;
            person: {
                displayName: string;
            } | null;
            action: import(".prisma/client").$Enums.AuditAction;
            entityType: string;
            entityId: string | null;
            oldValues: Prisma.JsonValue;
            newValues: Prisma.JsonValue;
            ipAddress: string | null;
            personId: string | null;
        }[];
    }>;
    quienVio(personId: string): Prisma.PrismaPromise<{
        user: {
            email: string;
            firstName: string;
            lastName: string;
        } | null;
        id: string;
        createdAt: Date;
        action: import(".prisma/client").$Enums.AuditAction;
        ipAddress: string | null;
    }[]>;
    resumen(): Promise<{
        hoy: {
            [k: string]: number;
        };
        loginsFallidos: {
            createdAt: Date;
            newValues: Prisma.JsonValue;
            ipAddress: string | null;
        }[];
        lecturasDeFichaHoy: number;
        busquedasDePacienteHoy: number;
    }>;
    exportar(user: User, req: {
        ip?: string;
    }, desde?: string, hasta?: string): Promise<{
        csv: string;
        filas: number;
    }>;
}
