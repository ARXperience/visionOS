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
exports.FollowupService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const audit_service_1 = require("../audit/audit.service");
let FollowupService = class FollowupService {
    prisma;
    audit;
    constructor(prisma, audit) {
        this.prisma = prisma;
        this.audit = audit;
    }
    async anotar(datos, ctx) {
        const yaEsta = await this.prisma.waitlistEntry.findFirst({
            where: {
                personId: datos.personId,
                serviceId: datos.serviceId,
                siteId: datos.siteId,
                isActive: true,
            },
            select: { id: true },
        });
        if (yaEsta)
            throw new common_1.BadRequestException('Ese paciente ya está en la lista para ese servicio.');
        const e = await this.prisma.waitlistEntry.create({
            data: { ...datos, priority: datos.priority ?? 0, notes: datos.notes?.trim() },
            select: { id: true, priority: true, createdAt: true },
        });
        await this.audit.record({
            userId: ctx.actor.id,
            action: 'CREATE',
            entityType: 'waitlist_entry',
            entityId: e.id,
            personId: datos.personId,
            siteId: datos.siteId,
            ipAddress: ctx.ip,
        });
        return e;
    }
    async espera(filtro) {
        const entradas = await this.prisma.waitlistEntry.findMany({
            where: {
                isActive: true,
                ...(filtro.siteId ? { siteId: filtro.siteId } : {}),
                ...(filtro.serviceId ? { serviceId: filtro.serviceId } : {}),
            },
            orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
            take: 200,
            select: {
                id: true,
                priority: true,
                preferredFrom: true,
                preferredTo: true,
                notifiedAt: true,
                notes: true,
                createdAt: true,
                person: { select: { id: true, displayName: true, phone: true } },
                service: { select: { id: true, name: true } },
                site: { select: { code: true } },
            },
        });
        const ahora = Date.now();
        return entradas.map((e) => ({
            ...e,
            diasEsperando: Math.floor((ahora - e.createdAt.getTime()) / 86_400_000),
        }));
    }
    async marcarOfrecido(id, ctx) {
        const e = await this.prisma.waitlistEntry.update({
            where: { id },
            data: { notifiedAt: new Date() },
            select: { id: true, notifiedAt: true, personId: true },
        });
        await this.audit.record({
            userId: ctx.actor.id,
            action: 'UPDATE',
            entityType: 'waitlist_entry',
            entityId: id,
            personId: e.personId,
            newValues: { ofrecido: true },
            ipAddress: ctx.ip,
        });
        return e;
    }
    async retirar(id, motivo, ctx) {
        const previa = await this.prisma.waitlistEntry.findUnique({
            where: { id },
            select: { personId: true, notes: true },
        });
        if (!previa)
            throw new common_1.NotFoundException('Entrada no encontrada');
        const e = await this.prisma.waitlistEntry.update({
            where: { id },
            data: {
                isActive: false,
                notes: motivo ? `${previa.notes ?? ''}\nRetirado: ${motivo.trim()}`.trim() : previa.notes,
            },
            select: { id: true, isActive: true },
        });
        await this.audit.record({
            userId: ctx.actor.id,
            action: 'UPDATE',
            entityType: 'waitlist_entry',
            entityId: id,
            personId: previa.personId,
            newValues: { retirado: motivo ?? true },
            ipAddress: ctx.ip,
        });
        return e;
    }
    async controlesPendientes(meses = 12, siteId) {
        const corte = new Date();
        corte.setUTCMonth(corte.getUTCMonth() - meses);
        const ahora = new Date();
        const conCitaFutura = await this.prisma.appointment.findMany({
            where: { startsAt: { gte: ahora }, status: { notIn: ['CANCELADA', 'NO_ASISTIO'] } },
            select: { personId: true },
        });
        const resueltos = new Set(conCitaFutura.map((c) => c.personId));
        const atendidas = await this.prisma.appointment.findMany({
            where: {
                status: 'FINALIZADA',
                startsAt: { lte: corte },
                ...(siteId ? { siteId } : {}),
            },
            orderBy: { startsAt: 'desc' },
            select: {
                personId: true,
                startsAt: true,
                service: { select: { name: true, businessLine: true } },
                site: { select: { code: true } },
                person: { select: { id: true, displayName: true, phone: true, deletedAt: true } },
            },
        });
        const ultima = new Map();
        for (const a of atendidas) {
            if (!ultima.has(a.personId))
                ultima.set(a.personId, a);
        }
        return [...ultima.values()]
            .filter((a) => !resueltos.has(a.personId) && !a.person.deletedAt)
            .map((a) => ({
            personId: a.person.id,
            paciente: a.person.displayName,
            telefono: a.person.phone,
            ultimaAtencion: a.startsAt.toISOString().slice(0, 10),
            mesesSinVolver: Math.floor((ahora.getTime() - a.startsAt.getTime()) / (30 * 86_400_000)),
            servicio: a.service.name,
            linea: a.service.businessLine,
            sede: a.site.code,
        }))
            .sort((a, b) => b.mesesSinVolver - a.mesesSinVolver)
            .slice(0, 300);
    }
    async resumen(siteId) {
        const [enEspera, ofrecidosSinRespuesta, pendientes] = await Promise.all([
            this.prisma.waitlistEntry.count({ where: { isActive: true, ...(siteId ? { siteId } : {}) } }),
            this.prisma.waitlistEntry.count({
                where: { isActive: true, notifiedAt: { not: null }, ...(siteId ? { siteId } : {}) },
            }),
            this.controlesPendientes(12, siteId),
        ]);
        return {
            enEspera,
            ofrecidosSinRespuesta,
            controlesPendientes: pendientes.length,
        };
    }
};
exports.FollowupService = FollowupService;
exports.FollowupService = FollowupService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService])
], FollowupService);
//# sourceMappingURL=followup.service.js.map