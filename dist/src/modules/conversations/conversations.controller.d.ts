import type { User } from '@prisma/client';
import type { Request } from 'express';
import { ConversationsService } from './conversations.service';
declare class EnviarDto {
    texto: string;
    interno?: boolean;
}
declare class AsignarDto {
    userId?: string | null;
}
declare class AlternarDto {
    activa: boolean;
}
export declare class ConversationsController {
    private readonly conversaciones;
    constructor(conversaciones: ConversationsService);
    private ctx;
    listar(user: User, estado?: string, sinLeer?: string): Promise<{
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
    detalle(id: string, user: User, req: Request): Promise<{
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
    enviar(id: string, dto: EnviarDto, user: User, req: Request): Promise<{
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
    leido(id: string): import(".prisma/client").Prisma.Prisma__ConversationClient<{
        id: string;
        unreadCount: number;
    }, never, import("@prisma/client/runtime/library").DefaultArgs, import(".prisma/client").Prisma.PrismaClientOptions>;
    asignar(id: string, dto: AsignarDto): import(".prisma/client").Prisma.Prisma__ConversationClient<{
        id: string;
        assignedTo: {
            firstName: string;
            lastName: string;
        } | null;
    }, never, import("@prisma/client/runtime/library").DefaultArgs, import(".prisma/client").Prisma.PrismaClientOptions>;
    ia(id: string, dto: AlternarDto): import(".prisma/client").Prisma.Prisma__ConversationClient<{
        id: string;
        aiEnabled: boolean;
    }, never, import("@prisma/client/runtime/library").DefaultArgs, import(".prisma/client").Prisma.PrismaClientOptions>;
    cerrar(id: string, dto: AlternarDto): import(".prisma/client").Prisma.Prisma__ConversationClient<{
        id: string;
        status: import(".prisma/client").$Enums.ConversationStatus;
    }, never, import("@prisma/client/runtime/library").DefaultArgs, import(".prisma/client").Prisma.PrismaClientOptions>;
}
export {};
