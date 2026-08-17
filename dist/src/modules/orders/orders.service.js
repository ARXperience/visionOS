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
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrdersService = void 0;
const common_1 = require("@nestjs/common");
const node_crypto_1 = require("node:crypto");
const prisma_service_1 = require("../../prisma/prisma.service");
const audit_service_1 = require("../audit/audit.service");
const storage_service_1 = require("../storage/storage.service");
const timeline_service_1 = require("../timeline/timeline.service");
let OrdersService = class OrdersService {
    prisma;
    audit;
    timeline;
    storage;
    constructor(prisma, audit, timeline, storage) {
        this.prisma = prisma;
        this.audit = audit;
        this.timeline = timeline;
        this.storage = storage;
    }
    async crear(datos, ctx) {
        const servicio = await this.prisma.service.findUnique({
            where: { id: datos.serviceId },
            select: { name: true, requiresAuthorization: true, isBilateral: true },
        });
        if (!servicio)
            throw new common_1.NotFoundException('Servicio no encontrado');
        const orden = await this.prisma.$transaction(async (tx) => {
            const o = await tx.serviceOrder.create({
                data: {
                    personId: datos.personId,
                    serviceId: datos.serviceId,
                    laterality: datos.laterality ?? (servicio.isBilateral ? 'AO' : 'NA'),
                    originAppointmentId: datos.originAppointmentId,
                    orderedByProfessionalId: datos.orderedByProfessionalId,
                    indications: datos.indications,
                    externalOrderUrl: datos.externalOrderUrl,
                    status: servicio.requiresAuthorization ? 'PENDIENTE' : 'AUTORIZADA',
                    dueDate: datos.vigenciaDias
                        ? new Date(Date.now() + datos.vigenciaDias * 86_400_000)
                        : null,
                    createdById: ctx.actor.id,
                },
                select: { id: true, status: true },
            });
            await this.timeline.emitir({
                personId: datos.personId,
                type: 'ORDEN_GENERADA',
                title: `Le ordenaron ${servicio.name}`,
                actorUserId: ctx.actor.id,
                refType: 'service_order',
                refId: o.id,
            }, tx);
            return o;
        });
        await this.audit.record({
            userId: ctx.actor.id,
            action: 'CREATE',
            entityType: 'service_order',
            entityId: orden.id,
            personId: datos.personId,
            newValues: { servicio: servicio.name },
            ipAddress: ctx.ip,
        });
        return orden;
    }
    listar(filtro) {
        return this.prisma.serviceOrder.findMany({
            where: {
                ...(filtro.estado ? { status: filtro.estado } : {}),
                ...(filtro.personId ? { personId: filtro.personId } : {}),
                ...(filtro.vencidas
                    ? { dueDate: { lt: new Date() }, status: { in: ['PENDIENTE', 'AUTORIZADA'] } }
                    : {}),
            },
            orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
            take: 200,
            select: {
                id: true,
                status: true,
                laterality: true,
                indications: true,
                authorizationNumber: true,
                dueDate: true,
                createdAt: true,
                person: { select: { id: true, displayName: true, phone: true } },
                service: {
                    select: { name: true, businessLine: true, requiresAuthorization: true, preparationNotes: true },
                },
                orderedBy: { select: { displayName: true } },
                scheduledAppointments: {
                    orderBy: { startsAt: 'desc' },
                    take: 1,
                    select: { id: true, publicCode: true, startsAt: true, status: true },
                },
                results: {
                    orderBy: { performedAt: 'desc' },
                    select: { id: true, fileName: true, isFinal: true, performedAt: true },
                },
            },
        });
    }
    async autorizar(id, numero, ctx) {
        const o = await this.prisma.serviceOrder.update({
            where: { id },
            data: { status: 'AUTORIZADA', authorizationNumber: numero, authorizedAt: new Date() },
            select: { id: true, status: true, personId: true },
        });
        await this.audit.record({
            userId: ctx.actor.id,
            action: 'UPDATE',
            entityType: 'service_order',
            entityId: id,
            personId: o.personId,
            newValues: { autorizacion: numero },
            ipAddress: ctx.ip,
        });
        return o;
    }
    async adjuntarResultado(id, datos, ctx) {
        const orden = await this.prisma.serviceOrder.findUnique({
            where: { id },
            select: { id: true, personId: true, service: { select: { name: true } } },
        });
        if (!orden)
            throw new common_1.NotFoundException('Orden no encontrada');
        const sha256 = datos.sha256 ??
            (datos.contenidoBase64
                ? (0, node_crypto_1.createHash)('sha256').update(Buffer.from(datos.contenidoBase64, 'base64')).digest('hex')
                : null);
        if (!sha256) {
            throw new common_1.BadRequestException('Falta el hash del archivo. Sin él no se puede demostrar que el resultado no cambió.');
        }
        const resultado = await this.prisma.$transaction(async (tx) => {
            const r = await tx.serviceResult.create({
                data: {
                    serviceOrderId: id,
                    fileUrl: datos.fileUrl,
                    fileName: datos.fileName,
                    mimeType: datos.mimeType,
                    sizeBytes: datos.sizeBytes,
                    sha256,
                    reportText: datos.reportText,
                    performedById: datos.performedById,
                    performedAt: new Date(),
                    isFinal: datos.isFinal ?? false,
                    uploadedById: ctx.actor.id,
                },
                select: { id: true, isFinal: true },
            });
            await tx.serviceOrder.update({
                where: { id },
                data: { status: datos.isFinal ? 'INFORMADA' : 'REALIZADA' },
            });
            await this.timeline.emitir({
                personId: orden.personId,
                type: 'RESULTADO_CARGADO',
                title: `Resultado de ${orden.service.name}${datos.isFinal ? '' : ' (preliminar)'}`,
                actorUserId: ctx.actor.id,
                refType: 'service_result',
                refId: r.id,
            }, tx);
            return r;
        });
        await this.audit.record({
            userId: ctx.actor.id,
            action: 'CREATE',
            entityType: 'service_result',
            entityId: resultado.id,
            personId: orden.personId,
            newValues: { archivo: datos.fileName, definitivo: resultado.isFinal, sha256 },
            ipAddress: ctx.ip,
        });
        return resultado;
    }
    async verResultado(id, ctx) {
        const r = await this.prisma.serviceResult.findUnique({
            where: { id },
            select: {
                id: true,
                fileUrl: true,
                fileName: true,
                mimeType: true,
                sha256: true,
                reportText: true,
                performedAt: true,
                isFinal: true,
                serviceOrder: { select: { personId: true, service: { select: { name: true } } } },
            },
        });
        if (!r)
            throw new common_1.NotFoundException('Resultado no encontrado');
        await this.audit.record({
            userId: ctx.actor.id,
            action: 'READ',
            entityType: 'service_result',
            entityId: id,
            personId: r.serviceOrder?.personId,
            ipAddress: ctx.ip,
        });
        const enlace = r.fileUrl && this.storage.habilitado
            ? (await this.storage.firmarDescarga(r.fileUrl, r.fileName)).url
            : null;
        return { ...r, enlace };
    }
    async anular(id, motivo, ctx) {
        const o = await this.prisma.serviceOrder.findUnique({
            where: { id },
            select: { personId: true, results: { select: { id: true } } },
        });
        if (!o)
            throw new common_1.NotFoundException('Orden no encontrada');
        if (o.results.length) {
            throw new common_1.BadRequestException('Esta orden ya tiene resultado: el examen se realizó y no puede anularse.');
        }
        const anulada = await this.prisma.serviceOrder.update({
            where: { id },
            data: { status: 'ANULADA', indications: motivo },
            select: { id: true, status: true },
        });
        await this.audit.record({
            userId: ctx.actor.id,
            action: 'UPDATE',
            entityType: 'service_order',
            entityId: id,
            personId: o.personId,
            newValues: { estado: 'ANULADA', motivo },
            ipAddress: ctx.ip,
        });
        return anulada;
    }
    async pendientes() {
        const [porEstado, vencidas, sinResultado] = await Promise.all([
            this.prisma.serviceOrder.groupBy({ by: ['status'], _count: true }),
            this.prisma.serviceOrder.count({
                where: { dueDate: { lt: new Date() }, status: { in: ['PENDIENTE', 'AUTORIZADA'] } },
            }),
            this.prisma.serviceOrder.count({
                where: { status: 'REALIZADA', updatedAt: { lt: new Date(Date.now() - 3 * 86_400_000) } },
            }),
        ]);
        return {
            porEstado: Object.fromEntries(porEstado.map((p) => [p.status, p._count])),
            vencidas,
            realizadasSinInforme: sinResultado,
        };
    }
};
exports.OrdersService = OrdersService;
exports.OrdersService = OrdersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService,
        timeline_service_1.TimelineService,
        storage_service_1.StorageService])
], OrdersService);
//# sourceMappingURL=orders.service.js.map