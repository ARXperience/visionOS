"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var ConversationsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConversationsService = void 0;
const common_1 = require("@nestjs/common");
const node_crypto_1 = require("node:crypto");
const prisma_service_1 = require("../../prisma/prisma.service");
const audit_service_1 = require("../audit/audit.service");
const GATEWAY = process.env.GATEWAY_URL ?? 'http://127.0.0.1:3002';
let ConversationsService = ConversationsService_1 = class ConversationsService {
    prisma;
    audit;
    logger = new common_1.Logger(ConversationsService_1.name);
    constructor(prisma, audit) {
        this.prisma = prisma;
        this.audit = audit;
    }
    async sedesDe(user) {
        if (user.crossSitePatientRead || user.role === 'SUPERADMIN')
            return null;
        const acceso = await this.prisma.userSiteAccess.findMany({
            where: { userId: user.id },
            select: { siteId: true },
        });
        return acceso.map((a) => a.siteId);
    }
    async listar(user, filtro) {
        const sedes = await this.sedesDe(user);
        return this.prisma.conversation.findMany({
            where: {
                deletedAt: null,
                ...(filtro.estado ? { status: filtro.estado } : {}),
                ...(filtro.sinLeer ? { unreadCount: { gt: 0 } } : {}),
                ...(sedes ? { OR: [{ siteId: { in: sedes } }, { siteId: null }] } : {}),
            },
            orderBy: [{ lastMessageAt: 'desc' }, { createdAt: 'desc' }],
            take: 100,
            select: {
                id: true,
                contactName: true,
                phoneNumber: true,
                status: true,
                aiEnabled: true,
                unreadCount: true,
                lastMessageAt: true,
                lastMessageText: true,
                tags: true,
                person: { select: { id: true, displayName: true, isPatient: true } },
                assignedTo: { select: { id: true, firstName: true, lastName: true } },
                site: { select: { id: true, code: true } },
            },
        });
    }
    async detalle(id, ctx) {
        const conv = await this.prisma.conversation.findFirst({
            where: { id, deletedAt: null },
            select: {
                id: true,
                contactName: true,
                phoneNumber: true,
                status: true,
                aiEnabled: true,
                externalId: true,
                channelId: true,
                siteId: true,
                tags: true,
                person: {
                    select: { id: true, displayName: true, isPatient: true, docNumber: true, phone: true },
                },
                assignedTo: { select: { id: true, firstName: true, lastName: true } },
                messages: {
                    orderBy: { createdAt: 'asc' },
                    take: 200,
                    select: {
                        id: true,
                        direction: true,
                        author: true,
                        type: true,
                        status: true,
                        body: true,
                        isInternal: true,
                        createdAt: true,
                        sentAt: true,
                        error: true,
                        sentBy: { select: { firstName: true, lastName: true } },
                    },
                },
            },
        });
        if (!conv)
            throw new common_1.NotFoundException('Conversación no encontrada');
        if (conv.person) {
            await this.audit.readOf(conv.person.id, {
                userId: ctx.user?.id ?? null,
                siteId: conv.siteId,
                ip: ctx.ip,
                userAgent: ctx.userAgent,
            });
        }
        return conv;
    }
    async enviar(id, texto, ctx, interno = false) {
        const conv = await this.prisma.conversation.findFirst({
            where: { id, deletedAt: null },
            select: { id: true, channelId: true, externalId: true },
        });
        if (!conv)
            throw new common_1.NotFoundException('Conversación no encontrada');
        const mensaje = await this.prisma.message.create({
            data: {
                conversationId: conv.id,
                direction: 'SALIENTE',
                author: 'AGENTE',
                type: 'TEXT',
                status: interno ? 'ENVIADO' : 'PENDIENTE',
                body: texto,
                isInternal: interno,
                sentById: ctx.user?.id ?? null,
                idempotencyKey: (0, node_crypto_1.randomUUID)(),
                ...(interno ? { sentAt: new Date() } : {}),
            },
        });
        if (interno)
            return mensaje;
        try {
            const r = await fetch(`${GATEWAY}/canales/${conv.channelId}/enviar`, {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ a: conv.externalId, texto }),
                signal: AbortSignal.timeout(20_000),
            });
            if (!r.ok)
                throw new Error(`gateway ${r.status}: ${await r.text()}`);
            const { externalId } = (await r.json());
            const enviado = await this.prisma.message.update({
                where: { id: mensaje.id },
                data: { status: 'ENVIADO', externalId, sentAt: new Date() },
            });
            await this.prisma.conversation.update({
                where: { id: conv.id },
                data: { lastMessageAt: new Date(), lastMessageText: texto.slice(0, 200) },
            });
            return enviado;
        }
        catch (e) {
            const motivo = e.message;
            this.logger.error(`No se pudo enviar el mensaje ${mensaje.id}: ${motivo}`);
            return this.prisma.message.update({
                where: { id: mensaje.id },
                data: { status: 'FALLIDO', failedAt: new Date(), error: motivo.slice(0, 500) },
            });
        }
    }
    async enviarSistema(conversationId, texto) {
        const m = await this.enviar(conversationId, texto, { user: null }, false);
        return this.prisma.message.update({
            where: { id: m.id },
            data: { author: 'SISTEMA', sentById: null },
        });
    }
    marcarLeida(id) {
        return this.prisma.conversation.update({
            where: { id },
            data: { unreadCount: 0 },
            select: { id: true, unreadCount: true },
        });
    }
    asignar(id, userId) {
        return this.prisma.conversation.update({
            where: { id },
            data: { assignedToId: userId, status: userId ? 'ABIERTA' : undefined },
            select: { id: true, assignedTo: { select: { firstName: true, lastName: true } } },
        });
    }
    ia(id, activa) {
        return this.prisma.conversation.update({
            where: { id },
            data: { aiEnabled: activa, aiPausedUntil: null },
            select: { id: true, aiEnabled: true },
        });
    }
    cerrar(id, cerrada) {
        return this.prisma.conversation.update({
            where: { id },
            data: { status: cerrada ? 'CERRADA' : 'ABIERTA' },
            select: { id: true, status: true },
        });
    }
};
exports.ConversationsService = ConversationsService;
exports.ConversationsService = ConversationsService = ConversationsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService])
], ConversationsService);
//# sourceMappingURL=conversations.service.js.map