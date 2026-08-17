import type { CredentialKind, User } from '@prisma/client';
import type { Request } from 'express';
import { StaffService } from './staff.service';
declare class CredencialDto {
    professionalId: string;
    kind: CredentialKind;
    number?: string;
    issuedBy?: string;
    issuedAt?: string;
    expiresAt?: string;
    fileUrl?: string;
    notes?: string;
}
export declare class StaffController {
    private readonly personal;
    constructor(personal: StaffService);
    private ctx;
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
    credenciales(professionalId: string): Promise<{
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
    registrar(dto: CredencialDto, user: User, req: Request): Promise<{
        id: string;
        kind: import(".prisma/client").$Enums.CredentialKind;
        expiresAt: Date | null;
    }>;
    eliminar(id: string, user: User, req: Request): Promise<{
        ok: boolean;
    }>;
}
export {};
