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
exports.TreasuryController = void 0;
const common_1 = require("@nestjs/common");
const class_validator_1 = require("class-validator");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const require_permission_decorator_1 = require("../../common/decorators/require-permission.decorator");
const treasury_service_1 = require("./treasury.service");
class CerrarDto {
    siteId;
    fecha;
    countedCash;
    openingFloat;
    notes;
}
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CerrarDto.prototype, "siteId", void 0);
__decorate([
    (0, class_validator_1.Matches)(/^\d{4}-\d{2}-\d{2}$/),
    __metadata("design:type", String)
], CerrarDto.prototype, "fecha", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CerrarDto.prototype, "countedCash", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CerrarDto.prototype, "openingFloat", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(500),
    __metadata("design:type", String)
], CerrarDto.prototype, "notes", void 0);
let TreasuryController = class TreasuryController {
    tesoreria;
    constructor(tesoreria) {
        this.tesoreria = tesoreria;
    }
    esperado(siteId, fecha) {
        return this.tesoreria.esperado(siteId, fecha ?? new Date().toISOString().slice(0, 10));
    }
    historico(siteId, dias) {
        return this.tesoreria.historico(siteId, Math.min(Number(dias) || 30, 365));
    }
    sinCerrar(siteId) {
        return this.tesoreria.sinCerrar(siteId);
    }
    cerrar(dto, user, req) {
        return this.tesoreria.cerrar(dto, { actor: user, ip: req.ip });
    }
};
exports.TreasuryController = TreasuryController;
__decorate([
    (0, common_1.Get)('esperado'),
    (0, require_permission_decorator_1.RequirePermission)('dashboard.read'),
    __param(0, (0, common_1.Query)('siteId')),
    __param(1, (0, common_1.Query)('fecha')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], TreasuryController.prototype, "esperado", null);
__decorate([
    (0, common_1.Get)('cierres'),
    (0, require_permission_decorator_1.RequirePermission)('dashboard.read'),
    __param(0, (0, common_1.Query)('siteId')),
    __param(1, (0, common_1.Query)('dias')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], TreasuryController.prototype, "historico", null);
__decorate([
    (0, common_1.Get)('sin-cerrar'),
    (0, require_permission_decorator_1.RequirePermission)('dashboard.read'),
    __param(0, (0, common_1.Query)('siteId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], TreasuryController.prototype, "sinCerrar", null);
__decorate([
    (0, common_1.Post)('cierres'),
    (0, require_permission_decorator_1.RequirePermission)('settings.manage'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [CerrarDto, Object, Object]),
    __metadata("design:returntype", void 0)
], TreasuryController.prototype, "cerrar", null);
exports.TreasuryController = TreasuryController = __decorate([
    (0, common_1.Controller)('tesoreria'),
    __metadata("design:paramtypes", [treasury_service_1.TreasuryService])
], TreasuryController);
//# sourceMappingURL=treasury.controller.js.map