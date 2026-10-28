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
exports.FollowupController = void 0;
const common_1 = require("@nestjs/common");
const class_validator_1 = require("class-validator");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const require_permission_decorator_1 = require("../../common/decorators/require-permission.decorator");
const followup_service_1 = require("./followup.service");
class AnotarDto {
    personId;
    siteId;
    serviceId;
    professionalId;
    preferredFrom;
    preferredTo;
    priority;
    notes;
}
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], AnotarDto.prototype, "personId", void 0);
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], AnotarDto.prototype, "siteId", void 0);
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], AnotarDto.prototype, "serviceId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], AnotarDto.prototype, "professionalId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], AnotarDto.prototype, "preferredFrom", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], AnotarDto.prototype, "preferredTo", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Number)
], AnotarDto.prototype, "priority", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(500),
    __metadata("design:type", String)
], AnotarDto.prototype, "notes", void 0);
class RetirarDto {
    motivo;
}
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(200),
    __metadata("design:type", String)
], RetirarDto.prototype, "motivo", void 0);
let FollowupController = class FollowupController {
    seguimiento;
    constructor(seguimiento) {
        this.seguimiento = seguimiento;
    }
    ctx(user, req) {
        return { actor: user, ip: req.ip };
    }
    resumen(siteId) {
        return this.seguimiento.resumen(siteId);
    }
    espera(siteId, serviceId) {
        return this.seguimiento.espera({ siteId, serviceId });
    }
    controles(meses, siteId) {
        return this.seguimiento.controlesPendientes(Math.min(Number(meses) || 12, 60), siteId);
    }
    anotar(dto, user, req) {
        return this.seguimiento.anotar({
            ...dto,
            preferredFrom: dto.preferredFrom ? new Date(dto.preferredFrom) : undefined,
            preferredTo: dto.preferredTo ? new Date(dto.preferredTo) : undefined,
        }, this.ctx(user, req));
    }
    ofrecido(id, user, req) {
        return this.seguimiento.marcarOfrecido(id, this.ctx(user, req));
    }
    retirar(id, dto, user, req) {
        return this.seguimiento.retirar(id, dto.motivo, this.ctx(user, req));
    }
};
exports.FollowupController = FollowupController;
__decorate([
    (0, common_1.Get)('resumen'),
    (0, require_permission_decorator_1.RequirePermission)('appointment.read'),
    __param(0, (0, common_1.Query)('siteId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], FollowupController.prototype, "resumen", null);
__decorate([
    (0, common_1.Get)('espera'),
    (0, require_permission_decorator_1.RequirePermission)('appointment.read'),
    __param(0, (0, common_1.Query)('siteId')),
    __param(1, (0, common_1.Query)('serviceId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], FollowupController.prototype, "espera", null);
__decorate([
    (0, common_1.Get)('controles'),
    (0, require_permission_decorator_1.RequirePermission)('appointment.read'),
    __param(0, (0, common_1.Query)('meses')),
    __param(1, (0, common_1.Query)('siteId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], FollowupController.prototype, "controles", null);
__decorate([
    (0, common_1.Post)('espera'),
    (0, require_permission_decorator_1.RequirePermission)('waitlist.manage'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [AnotarDto, Object, Object]),
    __metadata("design:returntype", void 0)
], FollowupController.prototype, "anotar", null);
__decorate([
    (0, common_1.Post)('espera/:id/ofrecido'),
    (0, require_permission_decorator_1.RequirePermission)('waitlist.manage'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], FollowupController.prototype, "ofrecido", null);
__decorate([
    (0, common_1.Post)('espera/:id/retirar'),
    (0, require_permission_decorator_1.RequirePermission)('waitlist.manage'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, RetirarDto, Object, Object]),
    __metadata("design:returntype", void 0)
], FollowupController.prototype, "retirar", null);
exports.FollowupController = FollowupController = __decorate([
    (0, common_1.Controller)('seguimiento'),
    __metadata("design:paramtypes", [followup_service_1.FollowupService])
], FollowupController);
//# sourceMappingURL=followup.controller.js.map