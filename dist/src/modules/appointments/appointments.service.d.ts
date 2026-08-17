import { Prisma, type AppointmentStatus, type CancelActor, type User } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { TimelineService } from '../timeline/timeline.service';
export declare class AppointmentsService {
    private readonly prisma;
    private readonly audit;
    private readonly timeline;
    constructor(prisma: PrismaService, audit: AuditService, timeline: TimelineService);
    crear(datos: {
        siteId: string;
        personId: string;
        serviceId: string;
        professionalId: string;
        roomId?: string | null;
        equipmentId?: string | null;
        startsAt: Date;
        laterality?: 'OD' | 'OI' | 'AO' | 'NA';
        notes?: string;
        conversationId?: string;
        createdVia?: 'BAILEYS' | 'WEB' | 'TELEFONO' | 'PRESENCIAL';
    }, ctx: {
        user?: User | null;
        ip?: string | null;
    }): Promise<{
        id: string;
        publicCode: string;
        startsAt: Date;
        endsAt: Date;
    }>;
    cambiarEstado(id: string, nuevo: AppointmentStatus, ctx: {
        user?: User | null;
        motivo?: string;
        actor?: CancelActor;
    }): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.AppointmentStatus;
        publicCode: string;
    }>;
    agenda(siteId: string, fecha: string): Prisma.PrismaPromise<{
        id: string;
        status: import(".prisma/client").$Enums.AppointmentStatus;
        service: {
            name: string;
            businessLine: import(".prisma/client").$Enums.BusinessLine;
            requiresDilation: boolean;
        };
        person: {
            id: string;
            phone: string | null;
            displayName: string;
        };
        bookings: {
            professional: {
                displayName: string;
                color: string | null;
            } | null;
        }[];
        notes: string | null;
        publicCode: string;
        startsAt: Date;
        endsAt: Date;
    }[]>;
}
