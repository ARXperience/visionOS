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
exports.ChannelsController = void 0;
const common_1 = require("@nestjs/common");
const class_validator_1 = require("class-validator");
const require_permission_decorator_1 = require("../../common/decorators/require-permission.decorator");
const prisma_service_1 = require("../../prisma/prisma.service");
const GATEWAY = process.env.GATEWAY_URL ?? 'http://127.0.0.1:3002';
class CrearCanalDto {
    nombre;
    siteId;
}
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(2),
    (0, class_validator_1.MaxLength)(60),
    __metadata("design:type", String)
], CrearCanalDto.prototype, "nombre", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CrearCanalDto.prototype, "siteId", void 0);
let ChannelsController = class ChannelsController {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    listar() {
        return this.prisma.channel.findMany({
            orderBy: { createdAt: 'asc' },
            select: {
                id: true,
                name: true,
                provider: true,
                status: true,
                phoneNumber: true,
                isDefault: true,
                lastConnectedAt: true,
                lastError: true,
                qrExpiresAt: true,
                site: { select: { id: true, code: true, name: true } },
                _count: { select: { conversations: true } },
            },
        });
    }
    crear(dto) {
        return this.prisma.channel.create({
            data: { provider: 'BAILEYS', name: dto.nombre, siteId: dto.siteId ?? null },
            select: { id: true, name: true, status: true },
        });
    }
    async qr(id) {
        const c = await this.prisma.channel.findUniqueOrThrow({
            where: { id },
            select: { qrCode: true, qrExpiresAt: true, status: true },
        });
        const vigente = c.qrExpiresAt && c.qrExpiresAt.getTime() > Date.now();
        return { qr: vigente ? c.qrCode : null, status: c.status, expiraEn: c.qrExpiresAt };
    }
    async conectar(id) {
        await this.prisma.channel.findUniqueOrThrow({ where: { id }, select: { id: true } });
        try {
            const r = await fetch(`${GATEWAY}/canales/${id}/conectar`, {
                method: 'POST',
                signal: AbortSignal.timeout(30_000),
            });
            if (!r.ok)
                throw new Error(`gateway ${r.status}: ${await r.text()}`);
            return { ok: true };
        }
        catch (e) {
            throw new common_1.BadGatewayException(`No responde el gateway de WhatsApp: ${e.message}`);
        }
    }
};
exports.ChannelsController = ChannelsController;
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('whatsapp.manage'),
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ChannelsController.prototype, "listar", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('whatsapp.manage'),
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [CrearCanalDto]),
    __metadata("design:returntype", void 0)
], ChannelsController.prototype, "crear", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('whatsapp.manage'),
    (0, common_1.Get)(':id/qr'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ChannelsController.prototype, "qr", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('whatsapp.manage'),
    (0, common_1.Post)(':id/conectar'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ChannelsController.prototype, "conectar", null);
exports.ChannelsController = ChannelsController = __decorate([
    (0, common_1.Controller)('canales'),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ChannelsController);
//# sourceMappingURL=channels.controller.js.map