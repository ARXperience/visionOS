import type { Laterality, User } from '@prisma/client';
import type { Request } from 'express';
import { OrdersService } from './orders.service';
declare class CrearOrdenDto {
    personId: string;
    serviceId: string;
    laterality?: Laterality;
    originAppointmentId?: string;
    orderedByProfessionalId?: string;
    indications?: string;
    externalOrderUrl?: string;
    vigenciaDias?: number;
}
declare class AutorizarDto {
    numero: string;
}
declare class ResultadoDto {
    fileUrl: string;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    sha256?: string;
    contenidoBase64?: string;
    reportText?: string;
    performedById?: string;
    equipmentId?: string;
    isFinal?: boolean;
}
declare class AnularDto {
    motivo: string;
}
export declare class OrdersController {
    private readonly ordenes;
    constructor(ordenes: OrdersService);
    private ctx;
    listar(estado?: string, personId?: string, vencidas?: string): import(".prisma/client").Prisma.PrismaPromise<{
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
    pendientes(): Promise<{
        porEstado: {
            [k: string]: number;
        };
        vencidas: number;
        realizadasSinInforme: number;
    }>;
    crear(dto: CrearOrdenDto, user: User, req: Request): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.ServiceOrderStatus;
    }>;
    autorizar(id: string, dto: AutorizarDto, user: User, req: Request): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.ServiceOrderStatus;
        personId: string;
    }>;
    resultado(id: string, dto: ResultadoDto, user: User, req: Request): Promise<{
        id: string;
        isFinal: boolean;
    }>;
    verResultado(id: string, user: User, req: Request): Promise<{
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
    anular(id: string, dto: AnularDto, user: User, req: Request): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.ServiceOrderStatus;
    }>;
}
export {};
