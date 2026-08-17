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
exports.StaffController = void 0;
const common_1 = require("@nestjs/common");
const class_validator_1 = require("class-validator");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const require_permission_decorator_1 = require("../../common/decorators/require-permission.decorator");
const staff_service_1 = require("./staff.service");
const TIPOS = [
    'TARJETA_PROFESIONAL',
    'RETHUS',
    'ESPECIALIZACION',
    'POLIZA_RESPONSABILIDAD',
    'CARNET_VACUNACION',
    'CURSO_SOPORTE_VITAL',
    'EXAMEN_OCUPACIONAL',
    'CONTRATO',
    'OTRO',
];
class CredencialDto {
    professionalId;
    kind;
    number;
    issuedBy;
    issuedAt;
    expiresAt;
    fileUrl;
    notes;
}
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CredencialDto.prototype, "professionalId", void 0);
__decorate([
    (0, class_validator_1.IsIn)(TIPOS),
    __metadata("design:type", String)
], CredencialDto.prototype, "kind", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(60),
    __metadata("design:type", String)
], CredencialDto.prototype, "number", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(120),
    __metadata("design:type", String)
], CredencialDto.prototype, "issuedBy", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CredencialDto.prototype, "issuedAt", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CredencialDto.prototype, "expiresAt", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(500),
    __metadata("design:type", String)
], CredencialDto.prototype, "fileUrl", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(500),
    __metadata("design:type", String)
], CredencialDto.prototype, "notes", void 0);
let StaffController = class StaffController {
    personal;
    constructor(personal) {
        this.personal = personal;
    }
    ctx(user, req) {
        return { actor: user, ip: req.ip };
    }
    alertas() {
        return this.personal.alertas();
    }
    credenciales(professionalId) {
        return this.personal.deProfesional(professionalId);
    }
    registrar(dto, user, req) {
        return this.personal.registrar({
            ...dto,
            issuedAt: dto.issuedAt ? new Date(dto.issuedAt) : undefined,
            expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
        }, this.ctx(user, req));
    }
    eliminar(id, user, req) {
        return this.personal.eliminar(id, this.ctx(user, req));
    }
};
exports.StaffController = StaffController;
__decorate([
    (0, common_1.Get)('alertas'),
    (0, require_permission_decorator_1.RequirePermission)('user.read'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], StaffController.prototype, "alertas", null);
__decorate([
    (0, common_1.Get)(':professionalId/credenciales'),
    (0, require_permission_decorator_1.RequirePermission)('user.read'),
    __param(0, (0, common_1.Param)('professionalId', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], StaffController.prototype, "credenciales", null);
__decorate([
    (0, common_1.Post)('credenciales'),
    (0, require_permission_decorator_1.RequirePermission)('user.manage'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [CredencialDto, Object, Object]),
    __metadata("design:returntype", void 0)
], StaffController.prototype, "registrar", null);
__decorate([
    (0, common_1.Delete)('credenciales/:id'),
    (0, require_permission_decorator_1.RequirePermission)('user.manage'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], StaffController.prototype, "eliminar", null);
exports.StaffController = StaffController = __decorate([
    (0, common_1.Controller)('personal'),
    __metadata("design:paramtypes", [staff_service_1.StaffService])
], StaffController);
//# sourceMappingURL=staff.controller.js.map