import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { TimelineService } from '../timeline/timeline.service';
export interface Solicitud {
    nombre: string;
    telefono: string;
    correo?: string;
    sede?: string;
    servicio?: string;
    mensaje?: string;
}
export declare class PublicoService {
    private readonly prisma;
    private readonly audit;
    private readonly timeline;
    private readonly log;
    constructor(prisma: PrismaService, audit: AuditService, timeline: TimelineService);
    sedes(): import(".prisma/client").Prisma.PrismaPromise<{
        name: string;
        phone: string | null;
        address: string;
        code: string;
        city: string;
        openingHours: import("@prisma/client/runtime/library").JsonValue;
    }[]>;
    servicios(): Promise<{
        linea: string;
        servicios: {
            name: string;
            slug: string;
            businessLine: import(".prisma/client").$Enums.BusinessLine;
            durationMin: number;
            requiresReferral: boolean;
            requiresAuthorization: boolean;
            requiresDilation: boolean;
            requiresCompanion: boolean;
        }[];
    }[]>;
    solicitar(datos: Solicitud, ip: string | null, userAgent: string | null): Promise<{
        radicado: string;
        mensaje: string;
    }>;
}
