import type { User } from '@prisma/client';
import type { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { PatientsService } from './patients.service';
declare const DOCS: readonly ["CC", "TI", "CE", "PA", "RC", "NIT", "MS", "AS", "PE", "PT", "CN", "SC", "DE"];
declare class BuscarOCrearDto {
    documento: string;
    tipoDocumento?: (typeof DOCS)[number];
    nombre?: string;
    apellido?: string;
    telefono?: string;
}
export declare class PatientsController {
    private readonly prisma;
    private readonly audit;
    private readonly pacientes;
    constructor(prisma: PrismaService, audit: AuditService, pacientes: PatientsService);
    buscar(q: string, user: User, req: Request): Promise<{
        id: string;
        phone: string | null;
        docType: import(".prisma/client").$Enums.DocumentType | null;
        docNumber: string | null;
        displayName: string;
        isPatient: boolean;
    }[]>;
    buscarOCrear(dto: BuscarOCrearDto, user: User, req: Request): Promise<{
        id: string;
        displayName: string;
        isPatient: boolean;
    }>;
    ficha(id: string, user: User, req: Request): Promise<{
        recorrido: {
            id: string;
            site: {
                code: string;
            } | null;
            title: string;
            occurredAt: Date;
            type: import(".prisma/client").$Enums.PatientEventType;
            refType: string | null;
            refId: string | null;
            payload: import("@prisma/client/runtime/library").JsonValue;
            actor: {
                firstName: string;
                lastName: string;
            } | null;
        }[];
        id: string;
        email: string | null;
        phone: string | null;
        consents: {
            grantedAt: Date;
            purpose: import(".prisma/client").$Enums.ConsentPurpose;
            granted: boolean;
            policyVersion: string;
            revokedAt: Date | null;
        }[];
        conversations: {
            id: string;
            status: import(".prisma/client").$Enums.ConversationStatus;
            phoneNumber: string | null;
            lastMessageAt: Date | null;
            lastMessageText: string | null;
        }[];
        docType: import(".prisma/client").$Enums.DocumentType | null;
        docNumber: string | null;
        displayName: string;
        birthDate: Date | null;
        sex: import(".prisma/client").$Enums.Sex | null;
        addressLine: string | null;
        isPatient: boolean;
        patientSince: Date | null;
        mrn: string | null;
        mergedIntoId: string | null;
        notes: string | null;
        tags: string[];
        coverages: {
            id: string;
            payer: {
                name: string;
                type: import(".prisma/client").$Enums.PayerType;
            };
            isPrimary: boolean;
            regime: import(".prisma/client").$Enums.Regime;
            planName: string | null;
        }[];
        appointments: {
            id: string;
            status: import(".prisma/client").$Enums.AppointmentStatus;
            site: {
                code: string;
            };
            service: {
                name: string;
            };
            publicCode: string;
            startsAt: Date;
        }[];
    }>;
}
export {};
