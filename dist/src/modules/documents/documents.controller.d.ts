import type { PersonDocumentKind, User } from '@prisma/client';
import type { Request } from 'express';
import { DocumentsService } from './documents.service';
declare class DocumentoDto {
    kind: PersonDocumentKind;
    title: string;
    fileUrl: string;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    sha256: string;
    expiresAt?: string;
}
declare class ArchivarDto {
    motivo: string;
}
export declare class DocumentsController {
    private readonly documentos;
    constructor(documentos: DocumentsService);
    private ctx;
    dePaciente(personId: string, user: User, req: Request): Promise<{
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
    registrar(personId: string, dto: DocumentoDto, user: User, req: Request): Promise<{
        id: string;
        createdAt: Date;
        kind: import(".prisma/client").$Enums.PersonDocumentKind;
        title: string;
    }>;
    abrir(id: string, user: User, req: Request): Promise<{
        url: string;
        expiraEn: number;
    }>;
    archivar(id: string, dto: ArchivarDto, user: User, req: Request): Promise<{
        ok: boolean;
    }>;
}
export {};
