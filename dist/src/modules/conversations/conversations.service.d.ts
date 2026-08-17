import type { ConversationStatus, User } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
interface Contexto {
    user: User | null;
    ip?: string | null;
    userAgent?: string | null;
}
export declare class ConversationsService {
    private readonly prisma;
    private readonly audit;
    private readonly logger;
    constructor(prisma: PrismaService, audit: AuditService);
    private sedesDe;
    listar(user: User, filtro: {
        estado?: ConversationStatus;
        sinLeer?: boolean;
    }): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.ConversationStatus;
        site: {
            id: string;
            code: string;
        } | null;
        person: {
            id: string;
            displayName: string;
            isPatient: boolean;
        } | null;
        tags: string[];
        aiEnabled: boolean;
        assignedTo: {
            id: string;
            firstName: string;
            lastName: string;
        } | null;
        contactName: string | null;
        phoneNumber: string | null;
        unreadCount: number;
        lastMessageAt: Date | null;
        lastMessageText: string | null;
    }[]>;
    detalle(id: string, ctx: Contexto): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.ConversationStatus;
        person: {
            id: string;
            phone: string | null;
            docNumber: string | null;
            displayName: string;
            isPatient: boolean;
        } | null;
        siteId: string | null;
        messages: {
            id: string;
            status: import(".prisma/client").$Enums.MessageStatus;
            createdAt: Date;
            error: string | null;
            sentAt: Date | null;
            type: import(".prisma/client").$Enums.MessageType;
            direction: import(".prisma/client").$Enums.MessageDirection;
            author: import(".prisma/client").$Enums.MessageAuthor;
            body: string | null;
            isInternal: boolean;
            sentBy: {
                firstName: string;
                lastName: string;
            } | null;
        }[];
        tags: string[];
        aiEnabled: boolean;
        assignedTo: {
            id: string;
            firstName: string;
            lastName: string;
        } | null;
        channelId: string;
        externalId: string;
        contactName: string | null;
        phoneNumber: string | null;
    }>;
    enviar(id: string, texto: string, ctx: Contexto, interno?: boolean): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.MessageStatus;
        metadata: import("@prisma/client/runtime/library").JsonValue;
        createdAt: Date;
        error: string | null;
        sentAt: Date | null;
        conversationId: string;
        fileName: string | null;
        deliveredAt: Date | null;
        type: import(".prisma/client").$Enums.MessageType;
        externalId: string | null;
        direction: import(".prisma/client").$Enums.MessageDirection;
        author: import(".prisma/client").$Enums.MessageAuthor;
        body: string | null;
        mediaUrl: string | null;
        mediaMime: string | null;
        mediaSize: number | null;
        isInternal: boolean;
        quotedExternalId: string | null;
        sentById: string | null;
        aiRunId: string | null;
        idempotencyKey: string | null;
        readAt: Date | null;
        failedAt: Date | null;
    }>;
    enviarSistema(conversationId: string, texto: string): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.MessageStatus;
        metadata: import("@prisma/client/runtime/library").JsonValue;
        createdAt: Date;
        error: string | null;
        sentAt: Date | null;
        conversationId: string;
        fileName: string | null;
        deliveredAt: Date | null;
        type: import(".prisma/client").$Enums.MessageType;
        externalId: string | null;
        direction: import(".prisma/client").$Enums.MessageDirection;
        author: import(".prisma/client").$Enums.MessageAuthor;
        body: string | null;
        mediaUrl: string | null;
        mediaMime: string | null;
        mediaSize: number | null;
        isInternal: boolean;
        quotedExternalId: string | null;
        sentById: string | null;
        aiRunId: string | null;
        idempotencyKey: string | null;
        readAt: Date | null;
        failedAt: Date | null;
    }>;
    marcarLeida(id: string): import(".prisma/client").Prisma.Prisma__ConversationClient<{
        id: string;
        unreadCount: number;
    }, never, import("@prisma/client/runtime/library").DefaultArgs, import(".prisma/client").Prisma.PrismaClientOptions>;
    asignar(id: string, userId: string | null): import(".prisma/client").Prisma.Prisma__ConversationClient<{
        id: string;
        assignedTo: {
            firstName: string;
            lastName: string;
        } | null;
    }, never, import("@prisma/client/runtime/library").DefaultArgs, import(".prisma/client").Prisma.PrismaClientOptions>;
    ia(id: string, activa: boolean): import(".prisma/client").Prisma.Prisma__ConversationClient<{
        id: string;
        aiEnabled: boolean;
    }, never, import("@prisma/client/runtime/library").DefaultArgs, import(".prisma/client").Prisma.PrismaClientOptions>;
    cerrar(id: string, cerrada: boolean): import(".prisma/client").Prisma.Prisma__ConversationClient<{
        id: string;
        status: import(".prisma/client").$Enums.ConversationStatus;
    }, never, import("@prisma/client/runtime/library").DefaultArgs, import(".prisma/client").Prisma.PrismaClientOptions>;
}
export {};
