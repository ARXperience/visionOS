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
exports.AiController = void 0;
const common_1 = require("@nestjs/common");
const class_validator_1 = require("class-validator");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const require_permission_decorator_1 = require("../../common/decorators/require-permission.decorator");
const prisma_service_1 = require("../../prisma/prisma.service");
const asistente_service_1 = require("./asistente.service");
const herramientas_1 = require("./herramientas");
class PublicarPromptDto {
    slug;
    content;
    notes;
    activar;
}
__decorate([
    (0, class_validator_1.IsIn)(['atencion', 'clasificacion']),
    __metadata("design:type", String)
], PublicarPromptDto.prototype, "slug", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(50),
    (0, class_validator_1.MaxLength)(20_000),
    __metadata("design:type", String)
], PublicarPromptDto.prototype, "content", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(300),
    __metadata("design:type", String)
], PublicarPromptDto.prototype, "notes", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], PublicarPromptDto.prototype, "activar", void 0);
let AiController = class AiController {
    prisma;
    asistente;
    constructor(prisma, asistente) {
        this.prisma = prisma;
        this.asistente = asistente;
    }
    async estado() {
        const desde = new Date();
        desde.setUTCDate(1);
        desde.setUTCHours(0, 0, 0, 0);
        const [gasto, corridas, escalados, prompts] = await Promise.all([
            this.prisma.aiRun.aggregate({ where: { createdAt: { gte: desde } }, _sum: { costoUsd: true } }),
            this.prisma.aiRun.count({ where: { createdAt: { gte: desde } } }),
            this.prisma.aiRun.count({ where: { createdAt: { gte: desde }, escaladoMotivo: { not: null } } }),
            this.prisma.aiPrompt.findMany({
                orderBy: [{ slug: 'asc' }, { version: 'desc' }],
                select: { id: true, slug: true, version: true, isActive: true, notes: true, createdAt: true },
            }),
        ]);
        return {
            habilitado: this.asistente.habilitado,
            modo: process.env.AI_MODO ?? 'COPILOTO',
            criterioAutonomo: 'sugerencias enviadas sin editar >= 60% sobre 100 conversaciones',
            gastoMesUsd: Number(gasto._sum.costoUsd ?? 0),
            presupuestoUsd: Number(process.env.AI_MONTHLY_BUDGET_USD ?? 60),
            corridasMes: corridas,
            escaladosMes: escalados,
            herramientas: herramientas_1.HERRAMIENTAS.map((h) => h.nombre),
            prompts,
        };
    }
    async publicar(dto, user) {
        const ultima = await this.prisma.aiPrompt.findFirst({
            where: { slug: dto.slug },
            orderBy: { version: 'desc' },
            select: { version: true },
        });
        return this.prisma.$transaction(async (tx) => {
            if (dto.activar) {
                await tx.aiPrompt.updateMany({ where: { slug: dto.slug, isActive: true }, data: { isActive: false } });
            }
            return tx.aiPrompt.create({
                data: {
                    slug: dto.slug,
                    version: (ultima?.version ?? 0) + 1,
                    content: dto.content,
                    notes: dto.notes,
                    isActive: dto.activar ?? false,
                    createdById: user.id,
                },
                select: { id: true, slug: true, version: true, isActive: true },
            });
        });
    }
    async activar(dto, _user) {
        const p = await this.prisma.aiPrompt.findUniqueOrThrow({
            where: { id: dto.id },
            select: { slug: true },
        });
        return this.prisma.$transaction(async (tx) => {
            await tx.aiPrompt.updateMany({ where: { slug: p.slug, isActive: true }, data: { isActive: false } });
            return tx.aiPrompt.update({
                where: { id: dto.id },
                data: { isActive: true },
                select: { id: true, slug: true, version: true, isActive: true },
            });
        });
    }
};
exports.AiController = AiController;
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('ai.configure'),
    (0, common_1.Get)('estado'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AiController.prototype, "estado", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('ai.configure'),
    (0, common_1.Post)('prompts'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [PublicarPromptDto, Object]),
    __metadata("design:returntype", Promise)
], AiController.prototype, "publicar", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('ai.configure'),
    (0, common_1.Post)('prompts/activar'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AiController.prototype, "activar", null);
exports.AiController = AiController = __decorate([
    (0, common_1.Controller)('asistente'),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        asistente_service_1.AsistenteService])
], AiController);
//# sourceMappingURL=ai.controller.js.map