import type { PatientEventType, Prisma, PrismaClient } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
export interface Evento {
    personId: string;
    type: PatientEventType;
    title: string;
    siteId?: string | null;
    actorUserId?: string | null;
    refType?: string;
    refId?: string;
    occurredAt?: Date;
    payload?: Prisma.InputJsonValue;
}
type Cliente = PrismaService | Parameters<Parameters<PrismaClient['$transaction']>[0]>[0];
export declare class TimelineService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    emitir(e: Evento, tx?: Cliente): Promise<void>;
    recorrido(personId: string, limite?: number): Prisma.PrismaPromise<{
        id: string;
        site: {
            code: string;
        } | null;
        title: string;
        occurredAt: Date;
        type: import(".prisma/client").$Enums.PatientEventType;
        refType: string | null;
        refId: string | null;
        payload: Prisma.JsonValue;
        actor: {
            firstName: string;
            lastName: string;
        } | null;
    }[]>;
}
export {};
