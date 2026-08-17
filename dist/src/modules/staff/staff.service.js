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
exports.StaffService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const audit_service_1 = require("../audit/audit.service");
const storage_service_1 = require("../storage/storage.service");
let StaffService = class StaffService {
    prisma;
    audit;
    storage;
    constructor(prisma, audit, storage) {
        this.prisma = prisma;
        this.audit = audit;
        this.storage = storage;
    }
    async registrar(datos, ctx) {
        if (datos.issuedAt && datos.expiresAt && datos.expiresAt <= datos.issuedAt) {
            throw new common_1.BadRequestException('La fecha de vencimiento es anterior a la de expedición.');
        }
        const c = await this.prisma.staffCredential.create({
            data: { ...datos, createdById: ctx.actor.id },
            select: { id: true, kind: true, expiresAt: true },
        });
        await this.audit.record({
            userId: ctx.actor.id,
            action: 'CREATE',
            entityType: 'staff_credential',
            entityId: c.id,
            newValues: { profesional: datos.professionalId, tipo: datos.kind, vence: datos.expiresAt },
            ipAddress: ctx.ip,
        });
        return c;
    }
    async eliminar(id, ctx) {
        const c = await this.prisma.staffCredential.findUnique({
            where: { id },
            select: { professionalId: true, kind: true },
        });
        if (!c)
            throw new common_1.NotFoundException('Credencial no encontrada');
        await this.prisma.staffCredential.delete({ where: { id } });
        await this.audit.record({
            userId: ctx.actor.id,
            action: 'DELETE',
            entityType: 'staff_credential',
            entityId: id,
            oldValues: { profesional: c.professionalId, tipo: c.kind },
            ipAddress: ctx.ip,
        });
        return { ok: true };
    }
    async deProfesional(professionalId) {
        const credenciales = await this.prisma.staffCredential.findMany({
            where: { professionalId },
            orderBy: [{ expiresAt: 'asc' }],
            select: {
                id: true,
                kind: true,
                number: true,
                issuedBy: true,
                issuedAt: true,
                expiresAt: true,
                fileUrl: true,
                notes: true,
            },
        });
        return Promise.all(credenciales.map(async (c) => ({
            ...c,
            enlace: c.fileUrl && this.storage.habilitado
                ? (await this.storage.firmarDescarga(c.fileUrl)).url
                : null,
            diasParaVencer: c.expiresAt
                ? Math.floor((c.expiresAt.getTime() - Date.now()) / 86_400_000)
                : null,
        })));
    }
    async alertas() {
        const en60 = new Date();
        en60.setUTCDate(en60.getUTCDate() + 60);
        const hoy = new Date();
        const profesionales = await this.prisma.professional.findMany({
            where: { isActive: true },
            select: {
                id: true,
                displayName: true,
                type: true,
                licenseNumber: true,
                credentials: { select: { id: true, kind: true, expiresAt: true, number: true } },
            },
        });
        const vencidas = [];
        const porVencer = [];
        const faltantes = [];
        const EXIGIDAS = ['TARJETA_PROFESIONAL', 'RETHUS', 'POLIZA_RESPONSABILIDAD'];
        for (const p of profesionales) {
            for (const c of p.credentials) {
                if (!c.expiresAt)
                    continue;
                if (c.expiresAt < hoy) {
                    vencidas.push({
                        profesional: p.displayName,
                        tipo: c.kind,
                        vencio: c.expiresAt.toISOString().slice(0, 10),
                    });
                }
                else if (c.expiresAt <= en60) {
                    porVencer.push({
                        profesional: p.displayName,
                        tipo: c.kind,
                        vence: c.expiresAt.toISOString().slice(0, 10),
                        dias: Math.floor((c.expiresAt.getTime() - hoy.getTime()) / 86_400_000),
                    });
                }
            }
            const tiene = new Set(p.credentials.map((c) => c.kind));
            const falta = EXIGIDAS.filter((k) => !tiene.has(k));
            if (falta.length)
                faltantes.push({ profesional: p.displayName, falta });
        }
        porVencer.sort((a, b) => a.dias - b.dias);
        return {
            vencidas,
            porVencer,
            sinRegistrar: faltantes,
            profesionalesActivos: profesionales.length,
        };
    }
};
exports.StaffService = StaffService;
exports.StaffService = StaffService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService,
        storage_service_1.StorageService])
], StaffService);
//# sourceMappingURL=staff.service.js.map