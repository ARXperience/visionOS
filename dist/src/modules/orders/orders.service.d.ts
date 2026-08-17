import type { Laterality, ServiceOrderStatus, User } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { StorageService } from '../storage/storage.service';
import { TimelineService } from '../timeline/timeline.service';
interface Ctx {
    actor: User;
    ip?: string | null;
}
export declare class OrdersService {
    private readonly prisma;
    private readonly audit;
    private readonly timeline;
    private readonly storage;
    constructor(prisma: PrismaService, audit: AuditService, timeline: TimelineService, storage: StorageService);
    crear(datos: {
        personId: string;
        serviceId: string;
        laterality?: Laterality;
        originAppointmentId?: string;
        orderedByProfessionalId?: string;
        indications?: string;
        externalOrderUrl?: string;
        vigenciaDias?: number;
    }, ctx: Ctx): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.ServiceOrderStatus;
    }>;
    listar(filtro: {
        estado?: ServiceOrderStatus;
        personId?: string;
        vencidas?: boolean;
    }): import(".prisma/client").Prisma.PrismaPromise<{
        id: string;
        status: import(".prisma/client").$Enums.ServiceOrderStatus;
        createdAt: Date;
        service: {
            name: string;
            businessLine: import(".prisma/client").$Enums.BusinessLine;
            requiresAuthorization: boolean;
            preparationNotes: string | null;
        };
        person: {
            id: string;
            phone: string | null;
            displayName: string;
        };
        laterality: import(".prisma/client").$Enums.Laterality;
        authorizationNumber: string | null;
        results: {
            id: string;
            fileName: string;
            performedAt: Date;
            isFinal: boolean;
        }[];
        dueDate: Date | null;
        indications: string | null;
        orderedBy: {
            displayName: string;
        } | null;
        scheduledAppointments: {
            id: string;
            status: import(".prisma/client").$Enums.AppointmentStatus;
            publicCode: string;
            startsAt: Date;
        }[];
    }[]>;
    autorizar(id: string, numero: string, ctx: Ctx): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.ServiceOrderStatus;
        personId: string;
    }>;
    adjuntarResultado(id: string, datos: {
        fileUrl: string;
        fileName: string;
        mimeType: string;
        sizeBytes: number;
        contenidoBase64?: string;
        sha256?: string;
        reportText?: string;
        performedById?: string;
        equipmentId?: string;
        isFinal?: boolean;
    }, ctx: Ctx): Promise<{
        id: string;
        isFinal: boolean;
    }>;
    verResultado(id: string, ctx: Ctx): Promise<{
        enlace: string | null;
        id: string;
        serviceOrder: {
            service: {
                name: string;
            };
            personId: string;
        } | null;
        sha256: string;
        fileUrl: string;
        fileName: string;
        mimeType: string;
        performedAt: Date;
        isFinal: boolean;
        reportText: string | null;
    }>;
    anular(id: string, motivo: string, ctx: Ctx): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.ServiceOrderStatus;
    }>;
    pendientes(): Promise<{
        porEstado: {
            [k: string]: number;
        };
        vencidas: number;
        realizadasSinInforme: number;
    }>;
}
export {};
