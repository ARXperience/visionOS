import type { CredentialKind, User } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { StorageService } from '../storage/storage.service';
interface Ctx {
    actor: User;
    ip?: string | null;
}
export declare class StaffService {
    private readonly prisma;
    private readonly audit;
    private readonly storage;
    constructor(prisma: PrismaService, audit: AuditService, storage: StorageService);
    registrar(datos: {
        professionalId: string;
        kind: CredentialKind;
        number?: string;
        issuedBy?: string;
        issuedAt?: Date;
        expiresAt?: Date;
        fileUrl?: string;
        notes?: string;
    }, ctx: Ctx): Promise<{
        id: string;
        kind: import(".prisma/client").$Enums.CredentialKind;
        expiresAt: Date | null;
    }>;
    eliminar(id: string, ctx: Ctx): Promise<{
        ok: boolean;
    }>;
    deProfesional(professionalId: string): Promise<{
        enlace: string | null;
        diasParaVencer: number | null;
        number: string | null;
        id: string;
        notes: string | null;
        kind: import(".prisma/client").$Enums.CredentialKind;
        fileUrl: string | null;
        expiresAt: Date | null;
        issuedAt: Date | null;
        issuedBy: string | null;
    }[]>;
    alertas(): Promise<{
        vencidas: {
            profesional: string;
            tipo: string;
            vencio: string;
        }[];
        porVencer: {
            profesional: string;
            tipo: string;
            vence: string;
            dias: number;
        }[];
        sinRegistrar: {
            profesional: string;
            falta: string[];
        }[];
        profesionalesActivos: number;
    }>;
}
export {};
