import { PrismaService } from '../../prisma/prisma.service';
export declare class CatalogController {
    private readonly prisma;
    constructor(prisma: PrismaService);
    servicios(): import(".prisma/client").Prisma.PrismaPromise<{
        name: string;
        id: string;
        code: string;
        cupsCode: string | null;
        slug: string;
        businessLine: import(".prisma/client").$Enums.BusinessLine;
        durationMin: number;
        requiredModality: import(".prisma/client").$Enums.EquipmentModality | null;
        requiresReferral: boolean;
        requiresAuthorization: boolean;
        requiresDilation: boolean;
    }[]>;
    sedes(): import(".prisma/client").Prisma.PrismaPromise<{
        name: string;
        id: string;
        phone: string | null;
        address: string;
        code: string;
        city: string;
    }[]>;
}
