import type { User } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { TimelineService } from '../timeline/timeline.service';
export declare class PatientsService {
    private readonly prisma;
    private readonly audit;
    private readonly timeline;
    constructor(prisma: PrismaService, audit: AuditService, timeline: TimelineService);
    ficha(id: string, ctx: {
        user: User;
        ip?: string | null;
        userAgent?: string | null;
    }): Promise<{
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
