import { Prisma, type LeadStatus, type User } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { TimelineService } from '../timeline/timeline.service';
interface Ctx {
    actor: User;
    ip?: string | null;
}
export declare class LeadsService {
    private readonly prisma;
    private readonly audit;
    private readonly timeline;
    constructor(prisma: PrismaService, audit: AuditService, timeline: TimelineService);
    listar(filtro: {
        status?: LeadStatus;
        assignedToId?: string;
        siteId?: string;
        sinTocar?: boolean;
    }): Promise<{
        tieneCita: boolean;
        horasSinTocar: number;
        id: string;
        status: import(".prisma/client").$Enums.LeadStatus;
        createdAt: Date;
        updatedAt: Date;
        site: {
            code: string;
        } | null;
        person: {
            id: string;
            phone: string | null;
            displayName: string;
            appointments: {
                id: string;
                status: import(".prisma/client").$Enums.AppointmentStatus;
                startsAt: Date;
            }[];
        };
        conversation: {
            id: string;
        } | null;
        assignedTo: {
            id: string;
            firstName: string;
            lastName: string;
        } | null;
        source: import(".prisma/client").$Enums.ChannelProvider;
        interestText: string | null;
        quotedAmount: Prisma.Decimal | null;
        quotedAt: Date | null;
        lostReason: string | null;
        convertedAt: Date | null;
        interestService: {
            name: string;
            id: string;
        } | null;
    }[]>;
    asignar(id: string, userId: string | null, ctx: Ctx): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.LeadStatus;
        personId: string;
    }>;
    cotizar(id: string, datos: {
        amount: number;
        serviceId?: string;
        nota?: string;
    }, ctx: Ctx): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.LeadStatus;
        siteId: string | null;
        personId: string;
        quotedAmount: Prisma.Decimal | null;
    }>;
    perder(id: string, motivo: string, ctx: Ctx): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.LeadStatus;
        lostReason: string | null;
    }>;
    private conciliarConversiones;
    embudo(desde?: Date, hasta?: Date): Promise<{
        total: number;
        porEstado: {
            [k: string]: number;
        };
        porOrigen: {
            [k: string]: number;
        };
        convertidos: number;
        tasaConversion: number | null;
        diasHastaConvertir: number | null;
        valorCotizado: string;
        sinTocar: number;
        motivosDePerdida: {
            motivo: string;
            veces: number;
        }[];
        conciliadosAhora: number;
    }>;
}
export {};
