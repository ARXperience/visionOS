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
exports.AuditController = void 0;
const common_1 = require("@nestjs/common");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const require_permission_decorator_1 = require("../../common/decorators/require-permission.decorator");
const prisma_service_1 = require("../../prisma/prisma.service");
const audit_service_1 = require("./audit.service");
const ACCIONES = [
    'CREATE', 'UPDATE', 'DELETE', 'READ', 'EXPORT',
    'LOGIN', 'LOGIN_FAILED', 'LOGOUT', 'PRINT', 'SHARE', 'MERGE',
];
const POR_PAGINA = 100;
let AuditController = class AuditController {
    prisma;
    audit;
    constructor(prisma, audit) {
        this.prisma = prisma;
        this.audit = audit;
    }
    async listar(accion, personId, userId, entidad, desde, hasta, pagina = '0') {
        const donde = {
            ...(accion && ACCIONES.includes(accion) ? { action: accion } : {}),
            ...(personId ? { personId } : {}),
            ...(userId ? { userId } : {}),
            ...(entidad ? { entityType: entidad } : {}),
            ...(desde || hasta
                ? {
                    createdAt: {
                        ...(desde ? { gte: new Date(`${desde}T00:00:00.000Z`) } : {}),
                        ...(hasta ? { lte: new Date(`${hasta}T23:59:59.999Z`) } : {}),
                    },
                }
                : {}),
        };
        const salto = Math.max(0, Number(pagina) || 0) * POR_PAGINA;
        const [total, filas] = await Promise.all([
            this.prisma.auditLog.count({ where: donde }),
            this.prisma.auditLog.findMany({
                where: donde,
                orderBy: { createdAt: 'desc' },
                skip: salto,
                take: POR_PAGINA,
                select: {
                    id: true,
                    action: true,
                    entityType: true,
                    entityId: true,
                    personId: true,
                    ipAddress: true,
                    oldValues: true,
                    newValues: true,
                    createdAt: true,
                    user: { select: { firstName: true, lastName: true, email: true } },
                    person: { select: { displayName: true } },
                },
            }),
        ]);
        return { total, pagina: Number(pagina) || 0, porPagina: POR_PAGINA, filas };
    }
    quienVio(personId) {
        return this.prisma.auditLog.findMany({
            where: { personId, action: { in: ['READ', 'EXPORT', 'PRINT', 'SHARE'] } },
            orderBy: { createdAt: 'desc' },
            take: 200,
            select: {
                id: true,
                action: true,
                ipAddress: true,
                createdAt: true,
                user: { select: { firstName: true, lastName: true, email: true } },
            },
        });
    }
    async resumen() {
        const hoy = new Date();
        hoy.setUTCHours(0, 0, 0, 0);
        const [porAccion, fallidos, lecturasFicha, busquedas] = await Promise.all([
            this.prisma.auditLog.groupBy({
                by: ['action'],
                where: { createdAt: { gte: hoy } },
                _count: true,
            }),
            this.prisma.auditLog.findMany({
                where: { action: 'LOGIN_FAILED', createdAt: { gte: hoy } },
                orderBy: { createdAt: 'desc' },
                take: 20,
                select: { ipAddress: true, newValues: true, createdAt: true },
            }),
            this.prisma.auditLog.count({
                where: {
                    action: 'READ',
                    entityType: 'person',
                    personId: { not: null },
                    createdAt: { gte: hoy },
                },
            }),
            this.prisma.auditLog.count({
                where: {
                    action: 'READ',
                    entityType: 'person',
                    personId: null,
                    createdAt: { gte: hoy },
                },
            }),
        ]);
        return {
            hoy: Object.fromEntries(porAccion.map((p) => [p.action, p._count])),
            loginsFallidos: fallidos,
            lecturasDeFichaHoy: lecturasFicha,
            busquedasDePacienteHoy: busquedas,
        };
    }
    async exportar(user, req, desde, hasta) {
        const filas = await this.prisma.auditLog.findMany({
            where: desde || hasta
                ? {
                    createdAt: {
                        ...(desde ? { gte: new Date(`${desde}T00:00:00.000Z`) } : {}),
                        ...(hasta ? { lte: new Date(`${hasta}T23:59:59.999Z`) } : {}),
                    },
                }
                : {},
            orderBy: { createdAt: 'desc' },
            take: 10_000,
            select: {
                createdAt: true,
                action: true,
                entityType: true,
                entityId: true,
                ipAddress: true,
                user: { select: { email: true } },
                person: { select: { displayName: true } },
            },
        });
        await this.audit.record({
            userId: user.id,
            action: 'EXPORT',
            entityType: 'audit_log',
            newValues: { filas: filas.length, desde, hasta },
            ipAddress: req.ip ?? null,
        });
        const escapar = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
        const csv = [
            'fecha,accion,entidad,entidad_id,usuario,paciente,ip',
            ...filas.map((f) => [
                f.createdAt.toISOString(),
                f.action,
                f.entityType,
                f.entityId,
                f.user?.email,
                f.person?.displayName,
                f.ipAddress,
            ]
                .map(escapar)
                .join(',')),
        ].join('\n');
        return { csv, filas: filas.length };
    }
};
exports.AuditController = AuditController;
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('audit.read'),
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('accion')),
    __param(1, (0, common_1.Query)('personId')),
    __param(2, (0, common_1.Query)('userId')),
    __param(3, (0, common_1.Query)('entidad')),
    __param(4, (0, common_1.Query)('desde')),
    __param(5, (0, common_1.Query)('hasta')),
    __param(6, (0, common_1.Query)('pagina')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, String, Object]),
    __metadata("design:returntype", Promise)
], AuditController.prototype, "listar", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('audit.read'),
    (0, common_1.Get)('paciente'),
    __param(0, (0, common_1.Query)('personId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AuditController.prototype, "quienVio", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('audit.read'),
    (0, common_1.Get)('resumen'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AuditController.prototype, "resumen", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('audit.read'),
    (0, common_1.Get)('exportar'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Query)('desde')),
    __param(3, (0, common_1.Query)('hasta')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String, String]),
    __metadata("design:returntype", Promise)
], AuditController.prototype, "exportar", null);
exports.AuditController = AuditController = __decorate([
    (0, common_1.Controller)('auditoria'),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService])
], AuditController);
//# sourceMappingURL=audit.controller.js.map