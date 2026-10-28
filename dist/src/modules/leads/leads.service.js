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
exports.LeadsService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../../prisma/prisma.service");
const audit_service_1 = require("../audit/audit.service");
const timeline_service_1 = require("../timeline/timeline.service");
const CERO = new client_1.Prisma.Decimal(0);
let LeadsService = class LeadsService {
    prisma;
    audit;
    timeline;
    constructor(prisma, audit, timeline) {
        this.prisma = prisma;
        this.audit = audit;
        this.timeline = timeline;
    }
    async listar(filtro) {
        const leads = await this.prisma.lead.findMany({
            where: {
                ...(filtro.status ? { status: filtro.status } : {}),
                ...(filtro.assignedToId ? { assignedToId: filtro.assignedToId } : {}),
                ...(filtro.siteId ? { siteId: filtro.siteId } : {}),
                ...(filtro.sinTocar ? { status: 'NUEVO', assignedToId: null } : {}),
            },
            orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
            take: 200,
            select: {
                id: true,
                status: true,
                source: true,
                interestText: true,
                quotedAmount: true,
                quotedAt: true,
                lostReason: true,
                convertedAt: true,
                createdAt: true,
                updatedAt: true,
                person: {
                    select: {
                        id: true,
                        displayName: true,
                        phone: true,
                        appointments: {
                            select: { id: true, startsAt: true, status: true },
                            orderBy: { startsAt: 'desc' },
                            take: 1,
                        },
                    },
                },
                interestService: { select: { id: true, name: true } },
                assignedTo: { select: { id: true, firstName: true, lastName: true } },
                site: { select: { code: true } },
                conversation: { select: { id: true } },
            },
        });
        const ahora = Date.now();
        return leads.map((l) => ({
            ...l,
            tieneCita: l.person.appointments.length > 0,
            horasSinTocar: Math.floor((ahora - l.updatedAt.getTime()) / 3_600_000),
        }));
    }
    async asignar(id, userId, ctx) {
        const l = await this.prisma.lead.update({
            where: { id },
            data: {
                assignedToId: userId,
                ...(userId ? { status: 'CONTACTADO' } : {}),
            },
            select: { id: true, status: true, personId: true },
        });
        await this.audit.record({
            userId: ctx.actor.id,
            action: 'UPDATE',
            entityType: 'lead',
            entityId: id,
            personId: l.personId,
            newValues: { asignadoA: userId },
            ipAddress: ctx.ip,
        });
        return l;
    }
    async cotizar(id, datos, ctx) {
        const l = await this.prisma.lead.update({
            where: { id },
            data: {
                quotedAmount: new client_1.Prisma.Decimal(datos.amount),
                quotedAt: new Date(),
                status: 'COTIZADO',
                ...(datos.serviceId ? { interestServiceId: datos.serviceId } : {}),
                ...(datos.nota ? { interestText: datos.nota.trim() } : {}),
            },
            select: { id: true, status: true, quotedAmount: true, personId: true, siteId: true },
        });
        await this.timeline.emitir({
            personId: l.personId,
            type: 'COTIZACION_ENVIADA',
            title: `Cotización por ${datos.amount.toLocaleString('es-CO')}`,
            siteId: l.siteId,
            actorUserId: ctx.actor.id,
            refType: 'lead',
            refId: id,
        });
        await this.audit.record({
            userId: ctx.actor.id,
            action: 'UPDATE',
            entityType: 'lead',
            entityId: id,
            personId: l.personId,
            newValues: { cotizado: datos.amount },
            ipAddress: ctx.ip,
        });
        return l;
    }
    async perder(id, motivo, ctx) {
        const previo = await this.prisma.lead.findUnique({
            where: { id },
            select: { personId: true, siteId: true, convertedAt: true },
        });
        if (!previo)
            throw new common_1.NotFoundException('Lead no encontrado');
        if (previo.convertedAt) {
            throw new common_1.BadRequestException('Ese lead ya se convirtió: no se puede marcar como perdido.');
        }
        const l = await this.prisma.lead.update({
            where: { id },
            data: { status: 'PERDIDO', lostReason: motivo.trim() },
            select: { id: true, status: true, lostReason: true },
        });
        await this.timeline.emitir({
            personId: previo.personId,
            type: 'LEAD_PERDIDO',
            title: `Lead perdido: ${motivo.trim()}`,
            siteId: previo.siteId,
            actorUserId: ctx.actor.id,
            refType: 'lead',
            refId: id,
        });
        return l;
    }
    async conciliarConversiones() {
        const abiertos = await this.prisma.lead.findMany({
            where: { convertedAt: null, status: { notIn: ['PERDIDO', 'CONVERTIDO'] } },
            select: { id: true, personId: true, createdAt: true },
        });
        if (!abiertos.length)
            return 0;
        const conCita = await this.prisma.appointment.findMany({
            where: { personId: { in: abiertos.map((l) => l.personId) } },
            select: { personId: true, createdAt: true },
        });
        const primeraCita = new Map();
        for (const c of conCita) {
            const previa = primeraCita.get(c.personId);
            if (!previa || c.createdAt < previa)
                primeraCita.set(c.personId, c.createdAt);
        }
        let n = 0;
        for (const l of abiertos) {
            const cita = primeraCita.get(l.personId);
            if (!cita || cita < l.createdAt)
                continue;
            await this.prisma.lead.update({
                where: { id: l.id },
                data: { status: 'CONVERTIDO', convertedAt: cita },
            });
            n += 1;
        }
        return n;
    }
    async embudo(desde, hasta) {
        const conciliados = await this.conciliarConversiones();
        const rango = {
            ...(desde || hasta
                ? { createdAt: { ...(desde ? { gte: desde } : {}), ...(hasta ? { lte: hasta } : {}) } }
                : {}),
        };
        const [porEstado, porOrigen, perdidos, convertidos, sinTocar] = await Promise.all([
            this.prisma.lead.groupBy({ by: ['status'], where: rango, _count: true }),
            this.prisma.lead.groupBy({ by: ['source'], where: rango, _count: true }),
            this.prisma.lead.findMany({
                where: { ...rango, status: 'PERDIDO' },
                select: { lostReason: true },
            }),
            this.prisma.lead.findMany({
                where: { ...rango, convertedAt: { not: null } },
                select: { createdAt: true, convertedAt: true, quotedAmount: true },
            }),
            this.prisma.lead.count({ where: { status: 'NUEVO', assignedToId: null } }),
        ]);
        const total = porEstado.reduce((s, p) => s + p._count, 0);
        const dias = convertidos
            .filter((c) => c.convertedAt)
            .map((c) => (c.convertedAt.getTime() - c.createdAt.getTime()) / 86_400_000);
        const motivos = new Map();
        for (const p of perdidos) {
            const m = (p.lostReason ?? 'sin motivo').trim().toLowerCase();
            motivos.set(m, (motivos.get(m) ?? 0) + 1);
        }
        return {
            total,
            porEstado: Object.fromEntries(porEstado.map((p) => [p.status, p._count])),
            porOrigen: Object.fromEntries(porOrigen.map((p) => [p.source, p._count])),
            convertidos: convertidos.length,
            tasaConversion: total ? Number(((convertidos.length / total) * 100).toFixed(1)) : null,
            diasHastaConvertir: dias.length ? Number((dias.reduce((a, b) => a + b, 0) / dias.length).toFixed(1)) : null,
            valorCotizado: convertidos.reduce((s, c) => s.plus(c.quotedAmount ?? CERO), CERO).toFixed(2),
            sinTocar,
            motivosDePerdida: [...motivos.entries()]
                .map(([motivo, veces]) => ({ motivo, veces }))
                .sort((a, b) => b.veces - a.veces),
            conciliadosAhora: conciliados,
        };
    }
};
exports.LeadsService = LeadsService;
exports.LeadsService = LeadsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService,
        timeline_service_1.TimelineService])
], LeadsService);
//# sourceMappingURL=leads.service.js.map