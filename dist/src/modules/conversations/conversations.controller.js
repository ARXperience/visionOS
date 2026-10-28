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
exports.ConversationsController = void 0;
const common_1 = require("@nestjs/common");
const class_validator_1 = require("class-validator");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const require_permission_decorator_1 = require("../../common/decorators/require-permission.decorator");
const conversations_service_1 = require("./conversations.service");
class EnviarDto {
    texto;
    interno;
}
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(1),
    (0, class_validator_1.MaxLength)(4000),
    __metadata("design:type", String)
], EnviarDto.prototype, "texto", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], EnviarDto.prototype, "interno", void 0);
class AsignarDto {
    userId;
}
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", Object)
], AsignarDto.prototype, "userId", void 0);
class AlternarDto {
    activa;
}
__decorate([
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], AlternarDto.prototype, "activa", void 0);
let ConversationsController = class ConversationsController {
    conversaciones;
    constructor(conversaciones) {
        this.conversaciones = conversaciones;
    }
    ctx(req, user) {
        return { user, ip: req.ip ?? null, userAgent: req.headers['user-agent'] ?? null };
    }
    listar(user, estado, sinLeer) {
        return this.conversaciones.listar(user, {
            estado: ['ABIERTA', 'PENDIENTE', 'CERRADA'].includes(estado ?? '')
                ? estado
                : undefined,
            sinLeer: sinLeer === 'true',
        });
    }
    detalle(id, user, req) {
        return this.conversaciones.detalle(id, this.ctx(req, user));
    }
    enviar(id, dto, user, req) {
        return this.conversaciones.enviar(id, dto.texto, this.ctx(req, user), dto.interno ?? false);
    }
    leido(id) {
        return this.conversaciones.marcarLeida(id);
    }
    asignar(id, dto) {
        return this.conversaciones.asignar(id, dto.userId ?? null);
    }
    ia(id, dto) {
        return this.conversaciones.ia(id, dto.activa);
    }
    cerrar(id, dto) {
        return this.conversaciones.cerrar(id, dto.activa);
    }
};
exports.ConversationsController = ConversationsController;
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('conversation.read'),
    (0, common_1.Get)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('estado')),
    __param(2, (0, common_1.Query)('sinLeer')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], ConversationsController.prototype, "listar", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('conversation.read'),
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], ConversationsController.prototype, "detalle", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('conversation.write'),
    (0, common_1.Post)(':id/mensajes'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, EnviarDto, Object, Object]),
    __metadata("design:returntype", void 0)
], ConversationsController.prototype, "enviar", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('conversation.read'),
    (0, common_1.Post)(':id/leido'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ConversationsController.prototype, "leido", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('conversation.assign'),
    (0, common_1.Post)(':id/asignar'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, AsignarDto]),
    __metadata("design:returntype", void 0)
], ConversationsController.prototype, "asignar", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('ai.toggle'),
    (0, common_1.Post)(':id/ia'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, AlternarDto]),
    __metadata("design:returntype", void 0)
], ConversationsController.prototype, "ia", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('conversation.write'),
    (0, common_1.Post)(':id/cerrar'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, AlternarDto]),
    __metadata("design:returntype", void 0)
], ConversationsController.prototype, "cerrar", null);
exports.ConversationsController = ConversationsController = __decorate([
    (0, common_1.Controller)('conversaciones'),
    __metadata("design:paramtypes", [conversations_service_1.ConversationsService])
], ConversationsController);
//# sourceMappingURL=conversations.controller.js.map