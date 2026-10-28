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
exports.LeadsController = void 0;
const common_1 = require("@nestjs/common");
const class_validator_1 = require("class-validator");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const require_permission_decorator_1 = require("../../common/decorators/require-permission.decorator");
const leads_service_1 = require("./leads.service");
class AsignarDto {
    userId;
}
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], AsignarDto.prototype, "userId", void 0);
class CotizarDto {
    amount;
    serviceId;
    nota;
}
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CotizarDto.prototype, "amount", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CotizarDto.prototype, "serviceId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(1000),
    __metadata("design:type", String)
], CotizarDto.prototype, "nota", void 0);
class PerderDto {
    motivo;
}
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(3),
    (0, class_validator_1.MaxLength)(200),
    __metadata("design:type", String)
], PerderDto.prototype, "motivo", void 0);
let LeadsController = class LeadsController {
    leads;
    constructor(leads) {
        this.leads = leads;
    }
    ctx(user, req) {
        return { actor: user, ip: req.ip };
    }
    listar(status, assignedToId, siteId, sinTocar) {
        return this.leads.listar({ status, assignedToId, siteId, sinTocar: sinTocar === 'true' });
    }
    embudo(desde, hasta) {
        return this.leads.embudo(desde ? new Date(desde) : undefined, hasta ? new Date(hasta) : undefined);
    }
    asignar(id, dto, user, req) {
        return this.leads.asignar(id, dto.userId ?? null, this.ctx(user, req));
    }
    cotizar(id, dto, user, req) {
        return this.leads.cotizar(id, dto, this.ctx(user, req));
    }
    perder(id, dto, user, req) {
        return this.leads.perder(id, dto.motivo, this.ctx(user, req));
    }
};
exports.LeadsController = LeadsController;
__decorate([
    (0, common_1.Get)(),
    (0, require_permission_decorator_1.RequirePermission)('lead.read'),
    __param(0, (0, common_1.Query)('status')),
    __param(1, (0, common_1.Query)('assignedToId')),
    __param(2, (0, common_1.Query)('siteId')),
    __param(3, (0, common_1.Query)('sinTocar')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", void 0)
], LeadsController.prototype, "listar", null);
__decorate([
    (0, common_1.Get)('embudo'),
    (0, require_permission_decorator_1.RequirePermission)('lead.read'),
    __param(0, (0, common_1.Query)('desde')),
    __param(1, (0, common_1.Query)('hasta')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], LeadsController.prototype, "embudo", null);
__decorate([
    (0, common_1.Post)(':id/asignar'),
    (0, require_permission_decorator_1.RequirePermission)('lead.write'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, AsignarDto, Object, Object]),
    __metadata("design:returntype", void 0)
], LeadsController.prototype, "asignar", null);
__decorate([
    (0, common_1.Post)(':id/cotizar'),
    (0, require_permission_decorator_1.RequirePermission)('lead.write'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, CotizarDto, Object, Object]),
    __metadata("design:returntype", void 0)
], LeadsController.prototype, "cotizar", null);
__decorate([
    (0, common_1.Post)(':id/perder'),
    (0, require_permission_decorator_1.RequirePermission)('lead.write'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, PerderDto, Object, Object]),
    __metadata("design:returntype", void 0)
], LeadsController.prototype, "perder", null);
exports.LeadsController = LeadsController = __decorate([
    (0, common_1.Controller)('leads'),
    __metadata("design:paramtypes", [leads_service_1.LeadsService])
], LeadsController);
//# sourceMappingURL=leads.controller.js.map