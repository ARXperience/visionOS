import type { PersonDocumentKind, User } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { StorageService } from '../storage/storage.service';
interface Ctx {
    actor: User;
    ip?: string | null;
}
export declare class DocumentsService {
    private readonly prisma;
    private readonly audit;
    private readonly storage;
    constructor(prisma: PrismaService, audit: AuditService, storage: StorageService);
    registrar(datos: {
        personId: string;
        kind: PersonDocumentKind;
        title: string;
        fileUrl: string;
        fileName: string;
        mimeType: string;
        sizeBytes: number;
        sha256: string;
        expiresAt?: Date;
    }, ctx: Ctx): Promise<{
        id: string;
        createdAt: Date;
        kind: import(".prisma/client").$Enums.PersonDocumentKind;
        title: string;
    }>;
    dePaciente(personId: string, ctx: Ctx): Promise<{
        vencido: boolean;
        id: string;
        createdAt: Date;
        kind: import(".prisma/client").$Enums.PersonDocumentKind;
        sha256: string;
        title: string;
        fileName: string;
        mimeType: string;
        sizeBytes: number;
        expiresAt: Date | null;
        uploadedBy: {
            firstName: string;
            lastName: string;
        } | null;
    }[]>;
    abrir(id: string, ctx: Ctx): Promise<{
        url: string;
        expiraEn: number;
    }>;
    archivar(id: string, motivo: string, ctx: Ctx): Promise<{
        ok: boolean;
    }>;
}
export {};
