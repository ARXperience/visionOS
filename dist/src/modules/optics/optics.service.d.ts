import { Prisma, type User } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { InventoryService } from '../inventory/inventory.service';
import { TimelineService } from '../timeline/timeline.service';
interface Ctx {
    actor: User;
    ip?: string | null;
}
export declare class OpticsService {
    private readonly prisma;
    private readonly audit;
    private readonly inventario;
    private readonly timeline;
    constructor(prisma: PrismaService, audit: AuditService, inventario: InventoryService, timeline: TimelineService);
    emitirFormula(datos: {
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
    }, ctx: Ctx): Promise<{
        id: string;
        issuedAt: Date;
        validTo: Date | null;
    }>;
    formulas(personId: string): Prisma.PrismaPromise<{
        id: string;
        professional: {
            displayName: string;
        };
        notes: string | null;
        issuedAt: Date;
        validTo: Date | null;
        odSphere: Prisma.Decimal | null;
        odCylinder: Prisma.Decimal | null;
        odAxis: number | null;
        odAdd: Prisma.Decimal | null;
        oiSphere: Prisma.Decimal | null;
        oiCylinder: Prisma.Decimal | null;
        oiAxis: number | null;
        oiAdd: Prisma.Decimal | null;
        pupillaryDistance: Prisma.Decimal | null;
        lensType: string | null;
    }[]>;
    private siguienteNumero;
    crearOrden(datos: {
        prescriptionId: string;
        siteId: string;
        frameProductId?: string;
        frameOwn?: boolean;
        frameNote?: string;
        lensProductId?: string;
        lensNote?: string;
        lab?: string;
        promisedAt?: Date;
        price?: number;
        warrantyMonths?: number;
    }, ctx: Ctx): Promise<{
        number: string;
        id: string;
        status: import(".prisma/client").$Enums.OpticalOrderStatus;
        promisedAt: Date | null;
    }>;
    enviarALaboratorio(id: string, lab: string, promisedAt: Date | undefined, ctx: Ctx): Promise<{
        number: string;
        id: string;
        status: import(".prisma/client").$Enums.OpticalOrderStatus;
        lab: string | null;
        promisedAt: Date | null;
    }>;
    recibirDeLaboratorio(id: string, ctx: Ctx): Promise<{
        number: string;
        id: string;
        status: import(".prisma/client").$Enums.OpticalOrderStatus;
        receivedAt: Date | null;
    }>;
    entregar(id: string, deliveredTo: string | undefined, ctx: Ctx): Promise<{
        number: string;
        id: string;
        status: import(".prisma/client").$Enums.OpticalOrderStatus;
        deliveredAt: Date | null;
        warrantyMonths: number;
    }>;
    anular(id: string, motivo: string, ctx: Ctx): Promise<{
        number: string;
        id: string;
        status: import(".prisma/client").$Enums.OpticalOrderStatus;
    }>;
    ordenes(filtro: {
        status?: string;
        siteId?: string;
        personId?: string;
    }): Promise<{
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
            odSphere: Prisma.Decimal | null;
            odCylinder: Prisma.Decimal | null;
            odAxis: number | null;
            oiSphere: Prisma.Decimal | null;
            oiCylinder: Prisma.Decimal | null;
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
        price: Prisma.Decimal | null;
        frameProduct: {
            name: string;
            brand: string | null;
        } | null;
        lensProduct: {
            name: string;
        } | null;
    }[]>;
}
export {};
