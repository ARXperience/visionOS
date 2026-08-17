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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardController = void 0;
const common_1 = require("@nestjs/common");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const require_permission_decorator_1 = require("../../common/decorators/require-permission.decorator");
const prisma_service_1 = require("../../prisma/prisma.service");
let DashboardController = class DashboardController {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async hoy(user, siteId) {
        const inicio = new Date();
        inicio.setUTCHours(5, 0, 0, 0);
        const fin = new Date(inicio.getTime() + 24 * 3600_000);
        const sedes = user.crossSitePatientRead || user.role === 'SUPERADMIN'
            ? null
            : (await this.prisma.userSiteAccess.findMany({
                where: { userId: user.id },
                select: { siteId: true },
            })).map((a) => a.siteId);
        const dondeSede = siteId ? { siteId } : sedes ? { siteId: { in: sedes } } : {};
        const hoy = { startsAt: { gte: inicio, lt: fin }, ...dondeSede };
        const [porEstado, porSede, sinResponder, leadsNuevos, canales, mesPasado] = await Promise.all([
            this.prisma.appointment.groupBy({ by: ['status'], where: hoy, _count: true }),
            this.prisma.appointment.groupBy({
                by: ['siteId'],
                where: hoy,
                _count: true,
            }),
            this.prisma.conversation.count({
                where: {
                    deletedAt: null,
                    status: 'ABIERTA',
                    unreadCount: { gt: 0 },
                    lastMessageAt: { lt: new Date(Date.now() - 15 * 60_000) },
                },
            }),
            this.prisma.lead.count({ where: { status: 'NUEVO' } }),
            this.prisma.channel.findMany({
                select: { id: true, name: true, status: true, lastError: true },
            }),
            this.prisma.appointment.groupBy({
                by: ['status'],
                where: {
                    startsAt: {
                        gte: new Date(inicio.getFullYear(), inicio.getMonth() - 1, 1),
                        lt: new Date(inicio.getFullYear(), inicio.getMonth(), 1),
                    },
                    status: { in: ['FINALIZADA', 'NO_ASISTIO'] },
                },
                _count: true,
            }),
        ]);
        const cuenta = (estados) => porEstado.filter((p) => estados.includes(p.status)).reduce((s, p) => s + p._count, 0);
        const atendidas = mesPasado.find((m) => m.status === 'FINALIZADA')?._count ?? 0;
        const ausentes = mesPasado.find((m) => m.status === 'NO_ASISTIO')?._count ?? 0;
        const nombres = await this.prisma.site.findMany({ select: { id: true, code: true } });
        return {
            citas: {
                total: porEstado.reduce((s, p) => s + p._count, 0),
                confirmadas: cuenta(['CONFIRMADA']),
                sinConfirmar: cuenta(['PROGRAMADA']),
                enSala: cuenta(['LLEGO', 'EN_ADMISION', 'EN_ESPERA']),
                atendiendo: cuenta(['EN_ATENCION', 'EN_PROCEDIMIENTO']),
                finalizadas: cuenta(['FINALIZADA']),
                noAsistio: cuenta(['NO_ASISTIO']),
                canceladas: cuenta(['CANCELADA']),
            },
            porSede: porSede.map((p) => ({
                code: nombres.find((n) => n.id === p.siteId)?.code ?? '—',
                citas: p._count,
            })),
            conversacionesSinResponder: sinResponder,
            leadsNuevos,
            canales,
            noShowMesAnterior: atendidas + ausentes > 0 ? Math.round((ausentes / (atendidas + ausentes)) * 100) : null,
        };
    }
};
exports.DashboardController = DashboardController;
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('dashboard.read'),
    (0, common_1.Get)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('siteId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], DashboardController.prototype, "hoy", null);
exports.DashboardController = DashboardController = __decorate([
    (0, common_1.Controller)('tablero'),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], DashboardController);
//# sourceMappingURL=dashboard.controller.js.map