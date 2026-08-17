import type { AnesthesiaType, Laterality, Prisma, User } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { TimelineService } from '../timeline/timeline.service';
import { type Fase } from './lista-oms';
interface Ctx {
    actor: User;
    ip?: string | null;
}
export declare class SurgeriesService {
    private readonly prisma;
    private readonly audit;
    private readonly timeline;
    constructor(prisma: PrismaService, audit: AuditService, timeline: TimelineService);
    programar(datos: {
        appointmentId: string;
        laterality: Laterality;
        surgeonId: string;
        anesthesiologistId?: string;
        anesthesia?: AnesthesiaType;
        teamNotes?: string;
    }, ctx: Ctx): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.SurgeryStatus;
        laterality: import(".prisma/client").$Enums.Laterality;
    }>;
    listar(filtro: {
        siteId?: string;
        desde?: Date;
        hasta?: Date;
        status?: string;
        personId?: string;
    }): Prisma.PrismaPromise<{
        id: string;
        status: import(".prisma/client").$Enums.SurgeryStatus;
        site: {
            name: string;
            id: string;
            code: string;
        };
        person: {
            id: string;
            phone: string | null;
            docNumber: string | null;
            displayName: string;
        };
        appointment: {
            id: string;
            service: {
                name: string;
            };
            publicCode: string;
            startsAt: Date;
            endsAt: Date;
        };
        laterality: import(".prisma/client").$Enums.Laterality;
        teamNotes: string | null;
        anesthesia: import(".prisma/client").$Enums.AnesthesiaType;
        consentSignedAt: Date | null;
        consentFileUrl: string | null;
        entryAt: Date | null;
        pauseAt: Date | null;
        exitAt: Date | null;
        startedAt: Date | null;
        endedAt: Date | null;
        findings: string | null;
        complications: string | null;
        suspendReason: string | null;
        surgeon: {
            id: string;
            displayName: string;
        };
        anesthesiologist: {
            id: string;
            displayName: string;
        } | null;
        implants: {
            id: string;
            kind: string;
            brand: string | null;
            model: string | null;
            invima: string | null;
            lot: string | null;
            power: Prisma.Decimal | null;
            serial: string | null;
        }[];
    }[]>;
    ver(id: string, ctx: Ctx): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.SurgeryStatus;
        site: {
            name: string;
            id: string;
            code: string;
        };
        person: {
            id: string;
            phone: string | null;
            docNumber: string | null;
            displayName: string;
        };
        appointment: {
            id: string;
            service: {
                name: string;
            };
            publicCode: string;
            startsAt: Date;
            endsAt: Date;
        };
        laterality: import(".prisma/client").$Enums.Laterality;
        teamNotes: string | null;
        anesthesia: import(".prisma/client").$Enums.AnesthesiaType;
        consentSignedAt: Date | null;
        consentFileUrl: string | null;
        entryAt: Date | null;
        pauseAt: Date | null;
        exitAt: Date | null;
        startedAt: Date | null;
        endedAt: Date | null;
        findings: string | null;
        complications: string | null;
        suspendReason: string | null;
        surgeon: {
            id: string;
            displayName: string;
        };
        anesthesiologist: {
            id: string;
            displayName: string;
        } | null;
        implants: {
            id: string;
            kind: string;
            brand: string | null;
            model: string | null;
            invima: string | null;
            lot: string | null;
            power: Prisma.Decimal | null;
            serial: string | null;
        }[];
    }>;
    registrarConsentimiento(id: string, fileUrl: string | undefined, ctx: Ctx): Promise<{
        id: string;
        personId: string;
        consentSignedAt: Date | null;
    }>;
    cerrarFase(id: string, fase: Fase, respuestas: Record<string, unknown>, lateralidadConfirmada: Laterality | undefined, ctx: Ctx): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.SurgeryStatus;
        entryAt: Date | null;
        pauseAt: Date | null;
        exitAt: Date | null;
    }>;
    iniciar(id: string, ctx: Ctx): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.SurgeryStatus;
        startedAt: Date | null;
    }>;
    finalizar(id: string, datos: {
        findings?: string;
        complications?: string;
    }, ctx: Ctx): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.SurgeryStatus;
        endedAt: Date | null;
    }>;
    suspender(id: string, motivo: string, ctx: Ctx): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.SurgeryStatus;
        suspendReason: string | null;
    }>;
    registrarImplante(id: string, datos: {
        kind: string;
        brand?: string;
        model?: string;
        power?: number;
        lot?: string;
        serial?: string;
        invima?: string;
    }, ctx: Ctx): Promise<{
        id: string;
        kind: string;
        lot: string | null;
        serial: string | null;
    }>;
    trazabilidad(busqueda: {
        lot?: string;
        serial?: string;
        model?: string;
    }): Promise<{
        id: string;
        surgery: {
            id: string;
            person: {
                id: string;
                phone: string | null;
                docNumber: string | null;
                displayName: string;
            };
            laterality: import(".prisma/client").$Enums.Laterality;
            endedAt: Date | null;
        };
        kind: string;
        brand: string | null;
        model: string | null;
        lot: string | null;
        power: Prisma.Decimal | null;
        serial: string | null;
    }[]>;
    indicadores(siteId?: string): Promise<{
        porEstado: {
            [k: string]: number;
        };
        operadas: number;
        conComplicacion: number;
        tasaComplicacion: number | null;
        pendientesDeConsentimiento: number;
    }>;
}
export {};
