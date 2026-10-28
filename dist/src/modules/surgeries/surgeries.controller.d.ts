import type { AnesthesiaType, Laterality, User } from '@prisma/client';
import type { Request } from 'express';
import { SurgeriesService } from './surgeries.service';
declare class ProgramarDto {
    appointmentId: string;
    laterality: Laterality;
    surgeonId: string;
    anesthesiologistId?: string;
    anesthesia?: AnesthesiaType;
    teamNotes?: string;
}
declare class ConsentimientoDto {
    fileUrl?: string;
}
declare class FaseDto {
    respuestas: Record<string, unknown>;
    lateralidadConfirmada?: Laterality;
}
declare class FinalizarDto {
    findings?: string;
    complications?: string;
}
declare class SuspenderDto {
    motivo: string;
}
declare class ImplanteDto {
    kind: string;
    brand?: string;
    model?: string;
    power?: number;
    lot?: string;
    serial?: string;
    invima?: string;
}
export declare class SurgeriesController {
    private readonly cirugias;
    constructor(cirugias: SurgeriesService);
    private ctx;
    lista(): {
        readonly ENTRADA: import("./lista-oms").Item[];
        readonly PAUSA: import("./lista-oms").Item[];
        readonly SALIDA: import("./lista-oms").Item[];
    };
    listar(siteId?: string, desde?: string, hasta?: string, status?: string, personId?: string): import(".prisma/client").Prisma.PrismaPromise<{
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
            power: import("@prisma/client/runtime/library").Decimal | null;
            serial: string | null;
        }[];
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
    trazabilidad(lot?: string, serial?: string, model?: string): Promise<{
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
        power: import("@prisma/client/runtime/library").Decimal | null;
        serial: string | null;
    }[]>;
    ver(id: string, user: User, req: Request): Promise<{
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
            power: import("@prisma/client/runtime/library").Decimal | null;
            serial: string | null;
        }[];
    }>;
    programar(dto: ProgramarDto, user: User, req: Request): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.SurgeryStatus;
        laterality: import(".prisma/client").$Enums.Laterality;
    }>;
    consentimiento(id: string, dto: ConsentimientoDto, user: User, req: Request): Promise<{
        id: string;
        personId: string;
        consentSignedAt: Date | null;
    }>;
    fase(id: string, fase: string, dto: FaseDto, user: User, req: Request): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.SurgeryStatus;
        entryAt: Date | null;
        pauseAt: Date | null;
        exitAt: Date | null;
    }>;
    iniciar(id: string, user: User, req: Request): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.SurgeryStatus;
        startedAt: Date | null;
    }>;
    finalizar(id: string, dto: FinalizarDto, user: User, req: Request): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.SurgeryStatus;
        endedAt: Date | null;
    }>;
    suspender(id: string, dto: SuspenderDto, user: User, req: Request): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.SurgeryStatus;
        suspendReason: string | null;
    }>;
    implante(id: string, dto: ImplanteDto, user: User, req: Request): Promise<{
        id: string;
        kind: string;
        lot: string | null;
        serial: string | null;
    }>;
}
export {};
