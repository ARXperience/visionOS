import type { User } from '@prisma/client';
import type { Request } from 'express';
import { OpticsService } from './optics.service';
declare class FormulaDto {
    personId: string;
    professionalId: string;
    appointmentId?: string;
    mesesVigencia?: number;
    odSphere?: number;
    odCylinder?: number;
    odAxis?: number;
    odAdd?: number;
    oiSphere?: number;
    oiCylinder?: number;
    oiAxis?: number;
    oiAdd?: number;
    pupillaryDistance?: number;
    lensType?: string;
    notes?: string;
}
declare class OrdenDto {
    prescriptionId: string;
    siteId: string;
    frameProductId?: string;
    frameOwn?: boolean;
    frameNote?: string;
    lensProductId?: string;
    lensNote?: string;
    lab?: string;
    promisedAt?: string;
    price?: number;
    warrantyMonths?: number;
}
declare class LaboratorioDto {
    lab: string;
    promisedAt?: string;
}
declare class EntregaDto {
    deliveredTo?: string;
}
declare class AnularDto {
    motivo: string;
}
export declare class OpticsController {
    private readonly optica;
    constructor(optica: OpticsService);
    private ctx;
    ordenes(status?: string, siteId?: string, personId?: string): Promise<{
        diasDeAtraso: number;
        enGarantia: boolean;
        number: string;
        id: string;
        status: import(".prisma/client").$Enums.OpticalOrderStatus;
        site: {
            code: string;
        };
        person: {
            id: string;
            phone: string | null;
            displayName: string;
        };
        prescription: {
            odSphere: import("@prisma/client/runtime/library").Decimal | null;
            odCylinder: import("@prisma/client/runtime/library").Decimal | null;
            odAxis: number | null;
            oiSphere: import("@prisma/client/runtime/library").Decimal | null;
            oiCylinder: import("@prisma/client/runtime/library").Decimal | null;
            oiAxis: number | null;
            lensType: string | null;
        };
        sentAt: Date | null;
        receivedAt: Date | null;
        frameOwn: boolean;
        frameNote: string | null;
        lensNote: string | null;
        lab: string | null;
        promisedAt: Date | null;
        deliveredAt: Date | null;
        deliveredTo: string | null;
        warrantyMonths: number;
        price: import("@prisma/client/runtime/library").Decimal | null;
        frameProduct: {
            name: string;
            brand: string | null;
        } | null;
        lensProduct: {
            name: string;
        } | null;
    }[]>;
    formulas(personId: string): import(".prisma/client").Prisma.PrismaPromise<{
        id: string;
        professional: {
            displayName: string;
        };
        notes: string | null;
        issuedAt: Date;
        validTo: Date | null;
        odSphere: import("@prisma/client/runtime/library").Decimal | null;
        odCylinder: import("@prisma/client/runtime/library").Decimal | null;
        odAxis: number | null;
        odAdd: import("@prisma/client/runtime/library").Decimal | null;
        oiSphere: import("@prisma/client/runtime/library").Decimal | null;
        oiCylinder: import("@prisma/client/runtime/library").Decimal | null;
        oiAxis: number | null;
        oiAdd: import("@prisma/client/runtime/library").Decimal | null;
        pupillaryDistance: import("@prisma/client/runtime/library").Decimal | null;
        lensType: string | null;
    }[]>;
    emitir(dto: FormulaDto, user: User, req: Request): Promise<{
        id: string;
        issuedAt: Date;
        validTo: Date | null;
    }>;
    crear(dto: OrdenDto, user: User, req: Request): Promise<{
        number: string;
        id: string;
        status: import(".prisma/client").$Enums.OpticalOrderStatus;
        promisedAt: Date | null;
    }>;
    enviar(id: string, dto: LaboratorioDto, user: User, req: Request): Promise<{
        number: string;
        id: string;
        status: import(".prisma/client").$Enums.OpticalOrderStatus;
        lab: string | null;
        promisedAt: Date | null;
    }>;
    recibir(id: string, user: User, req: Request): Promise<{
        number: string;
        id: string;
        status: import(".prisma/client").$Enums.OpticalOrderStatus;
        receivedAt: Date | null;
    }>;
    entregar(id: string, dto: EntregaDto, user: User, req: Request): Promise<{
        number: string;
        id: string;
        status: import(".prisma/client").$Enums.OpticalOrderStatus;
        deliveredAt: Date | null;
        warrantyMonths: number;
    }>;
    anular(id: string, dto: AnularDto, user: User, req: Request): Promise<{
        number: string;
        id: string;
        status: import(".prisma/client").$Enums.OpticalOrderStatus;
    }>;
}
export {};
