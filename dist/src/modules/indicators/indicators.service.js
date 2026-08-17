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
exports.IndicatorsService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../../prisma/prisma.service");
const CERO = new client_1.Prisma.Decimal(0);
let IndicatorsService = class IndicatorsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async mensual(desde, hasta, siteId) {
        const sede = siteId ? { siteId } : {};
        const [citas, estados, ordenes, cirugias, pqrsf, facturas, optica, conversaciones] = await Promise.all([
            this.prisma.appointment.findMany({
                where: { ...sede, startsAt: { gte: desde, lte: hasta } },
                select: { id: true, status: true, startsAt: true, createdAt: true, serviceId: true },
            }),
            this.prisma.appointmentStatusEvent.findMany({
                where: { appointment: { ...sede, startsAt: { gte: desde, lte: hasta } } },
                select: { appointmentId: true, toStatus: true, occurredAt: true },
                orderBy: { occurredAt: 'asc' },
            }),
            this.prisma.serviceOrder.count({ where: { createdAt: { gte: desde, lte: hasta } } }),
            this.prisma.surgery.findMany({
                where: { ...sede, endedAt: { gte: desde, lte: hasta } },
                select: { complications: true, pauseAt: true },
            }),
            this.prisma.pqrsf.findMany({
                where: { createdAt: { gte: desde, lte: hasta } },
                select: { tipo: true, respondedAt: true, dueDate: true, satisfaccion: true },
            }),
            this.prisma.invoice.findMany({
                where: { ...sede, issuedAt: { gte: desde, lte: hasta }, status: { not: 'ANULADA' } },
                select: { total: true, payments: { select: { amount: true } } },
            }),
            this.prisma.opticalOrder.findMany({
                where: { ...sede, createdAt: { gte: desde, lte: hasta } },
                select: { status: true, promisedAt: true, deliveredAt: true },
            }),
            this.prisma.conversation.count({ where: { createdAt: { gte: desde, lte: hasta } } }),
        ]);
        const atendidas = citas.filter((c) => c.status === 'FINALIZADA').length;
        const noShow = citas.filter((c) => c.status === 'NO_ASISTIO').length;
        const canceladas = citas.filter((c) => c.status === 'CANCELADA').length;
        const efectivas = atendidas + noShow;
        const esperas = citas.map((c) => Math.max(0, Math.round((c.startsAt.getTime() - c.createdAt.getTime()) / 86_400_000)));
        const oportunidad = esperas.length
            ? Number((esperas.reduce((a, b) => a + b, 0) / esperas.length).toFixed(1))
            : null;
        const llegada = new Map();
        const esperasEnSala = [];
        for (const e of estados) {
            if (e.toStatus === 'LLEGO')
                llegada.set(e.appointmentId, e.occurredAt);
            if (e.toStatus === 'EN_ATENCION') {
                const l = llegada.get(e.appointmentId);
                if (l)
                    esperasEnSala.push(Math.round((e.occurredAt.getTime() - l.getTime()) / 60_000));
            }
        }
        const esperaSala = esperasEnSala.length
            ? Math.round(esperasEnSala.reduce((a, b) => a + b, 0) / esperasEnSala.length)
            : null;
        const facturado = facturas.reduce((s, f) => s.plus(f.total), CERO);
        const recaudado = facturas.reduce((s, f) => s.plus(f.payments.reduce((p, x) => p.plus(x.amount), CERO)), CERO);
        const respondidas = pqrsf.filter((p) => p.respondedAt);
        const aTiempo = respondidas.filter((p) => p.respondedAt <= p.dueDate).length;
        const calificadas = pqrsf.filter((p) => p.satisfaccion != null);
        const entregadas = optica.filter((o) => o.deliveredAt);
        const aTiempoOptica = entregadas.filter((o) => !o.promisedAt || o.deliveredAt <= o.promisedAt).length;
        const pct = (parte, total) => (total ? Number(((parte / total) * 100).toFixed(1)) : null);
        return {
            periodo: { desde: desde.toISOString().slice(0, 10), hasta: hasta.toISOString().slice(0, 10) },
            agenda: {
                programadas: citas.length,
                atendidas,
                noShow,
                canceladas,
                tasaNoShow: pct(noShow, efectivas),
                oportunidadDias: oportunidad,
                esperaEnSalaMin: esperaSala,
            },
            clinico: {
                ordenesGeneradas: ordenes,
                cirugias: cirugias.length,
                conComplicacion: cirugias.filter((c) => c.complications).length,
                conPausaRegistrada: pct(cirugias.filter((c) => c.pauseAt).length, cirugias.length),
            },
            dinero: {
                facturado: facturado.toFixed(2),
                recaudado: recaudado.toFixed(2),
                porRecaudar: facturado.minus(recaudado).toFixed(2),
                tasaRecaudo: facturado.isZero()
                    ? null
                    : Number(recaudado.div(facturado).mul(100).toFixed(1)),
            },
            experiencia: {
                pqrsf: pqrsf.length,
                quejasYReclamos: pqrsf.filter((p) => p.tipo === 'QUEJA' || p.tipo === 'RECLAMO').length,
                felicitaciones: pqrsf.filter((p) => p.tipo === 'FELICITACION').length,
                cumplimientoPlazo: pct(aTiempo, respondidas.length),
                satisfaccionMedia: calificadas.length
                    ? Number((calificadas.reduce((s, p) => s + p.satisfaccion, 0) / calificadas.length).toFixed(1))
                    : null,
            },
            optica: {
                ordenes: optica.length,
                entregadas: entregadas.length,
                entregaATiempo: pct(aTiempoOptica, entregadas.length),
            },
            canal: { conversacionesNuevas: conversaciones },
        };
    }
    async tendencia(meses, siteId) {
        const salida = [];
        const hoy = new Date();
        for (let i = meses - 1; i >= 0; i--) {
            const desde = new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth() - i, 1));
            const hasta = new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth() - i + 1, 0, 23, 59, 59));
            const m = await this.mensual(desde, hasta, siteId);
            salida.push({
                mes: desde.toISOString().slice(0, 7),
                citas: m.agenda.programadas,
                noShow: m.agenda.tasaNoShow,
                oportunidad: m.agenda.oportunidadDias,
                facturado: m.dinero.facturado,
                recaudo: m.dinero.tasaRecaudo,
                pqrsf: m.experiencia.pqrsf,
            });
        }
        return salida;
    }
};
exports.IndicatorsService = IndicatorsService;
exports.IndicatorsService = IndicatorsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], IndicatorsService);
//# sourceMappingURL=indicators.service.js.map