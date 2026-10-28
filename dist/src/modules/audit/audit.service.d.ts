import type { AuditAction, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
export interface AuditEntry {
    userId?: string | null;
    action: AuditAction;
    entityType: string;
    entityId?: string | null;
    personId?: string | null;
    siteId?: string | null;
    oldValues?: Prisma.InputJsonValue;
    newValues?: Prisma.InputJsonValue;
    ipAddress?: string | null;
    userAgent?: string | null;
    requestId?: string | null;
}
export declare class AuditService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    record(entry: AuditEntry): Promise<void>;
    readOf(personId: string, ctx: {
        userId?: string | null;
        siteId?: string | null;
        ip?: string | null;
        userAgent?: string | null;
    }): Promise<void>;
}
