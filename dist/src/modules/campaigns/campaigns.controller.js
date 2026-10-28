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
exports.CampaignsController = void 0;
const common_1 = require("@nestjs/common");
const class_validator_1 = require("class-validator");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const require_permission_decorator_1 = require("../../common/decorators/require-permission.decorator");
const campaigns_service_1 = require("./campaigns.service");
const ESTADOS = ['PLANEADA', 'CONFIRMADA', 'EJECUTADA', 'CANCELADA'];
class EmpresaDto {
    nit;
    name;
    contactName;
    contactPhone;
    contactEmail;
    address;
}
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(5),
    (0, class_validator_1.MaxLength)(20),
    __metadata("design:type", String)
], EmpresaDto.prototype, "nit", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(2),
    (0, class_validator_1.MaxLength)(160),
    __metadata("design:type", String)
], EmpresaDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(120),
    __metadata("design:type", String)
], EmpresaDto.prototype, "contactName", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(30),
    __metadata("design:type", String)
], EmpresaDto.prototype, "contactPhone", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(120),
    __metadata("design:type", String)
], EmpresaDto.prototype, "contactEmail", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(200),
    __metadata("design:type", String)
], EmpresaDto.prototype, "address", void 0);
class CampanaDto {
    companyId;
    siteId;
    name;
    scheduledAt;
    location;
    expectedPeople;
    notes;
}
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CampanaDto.prototype, "companyId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CampanaDto.prototype, "siteId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(3),
    (0, class_validator_1.MaxLength)(160),
    __metadata("design:type", String)
], CampanaDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CampanaDto.prototype, "scheduledAt", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(200),
    __metadata("design:type", String)
], CampanaDto.prototype, "location", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(5000),
    __metadata("design:type", Number)
], CampanaDto.prototype, "expectedPeople", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(1000),
    __metadata("design:type", String)
], CampanaDto.prototype, "notes", void 0);
class ParticipanteDto {
    documento;
    nombre;
    apellido;
    telefono;
    finding;
    needsFollowUp;
}
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(4),
    (0, class_validator_1.MaxLength)(20),
    __metadata("design:type", String)
], ParticipanteDto.prototype, "documento", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(2),
    (0, class_validator_1.MaxLength)(80),
    __metadata("design:type", String)
], ParticipanteDto.prototype, "nombre", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(80),
    __metadata("design:type", String)
], ParticipanteDto.prototype, "apellido", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(30),
    __metadata("design:type", String)
], ParticipanteDto.prototype, "telefono", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(300),
    __metadata("design:type", String)
], ParticipanteDto.prototype, "finding", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], ParticipanteDto.prototype, "needsFollowUp", void 0);
class EstadoDto {
    status;
}
__decorate([
    (0, class_validator_1.IsIn)(ESTADOS),
    __metadata("design:type", Object)
], EstadoDto.prototype, "status", void 0);
let CampaignsController = class CampaignsController {
    campanas;
    constructor(campanas) {
        this.campanas = campanas;
    }
    ctx(user, req) {
        return { actor: user, ip: req.ip };
    }
    empresas() {
        return this.campanas.empresas();
    }
    crearEmpresa(dto) {
        return this.campanas.crearEmpresa(dto);
    }
    listar(status) {
        return this.campanas.listar(status);
    }
    pendientes() {
        return this.campanas.pendientesDeLlamar();
    }
    crear(dto, user, req) {
        return this.campanas.crear({ ...dto, scheduledAt: new Date(dto.scheduledAt) }, this.ctx(user, req));
    }
    registrar(id, dto, user, req) {
        return this.campanas.registrar(id, dto, this.ctx(user, req));
    }
    estado(id, dto, user, req) {
        return this.campanas.cambiarEstado(id, dto.status, this.ctx(user, req));
    }
};
exports.CampaignsController = CampaignsController;
__decorate([
    (0, common_1.Get)('empresas'),
    (0, require_permission_decorator_1.RequirePermission)('lead.read'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], CampaignsController.prototype, "empresas", null);
__decorate([
    (0, common_1.Post)('empresas'),
    (0, require_permission_decorator_1.RequirePermission)('lead.write'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [EmpresaDto]),
    __metadata("design:returntype", void 0)
], CampaignsController.prototype, "crearEmpresa", null);
__decorate([
    (0, common_1.Get)(),
    (0, require_permission_decorator_1.RequirePermission)('lead.read'),
    __param(0, (0, common_1.Query)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], CampaignsController.prototype, "listar", null);
__decorate([
    (0, common_1.Get)('pendientes'),
    (0, require_permission_decorator_1.RequirePermission)('lead.read'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], CampaignsController.prototype, "pendientes", null);
__decorate([
    (0, common_1.Post)(),
    (0, require_permission_decorator_1.RequirePermission)('lead.write'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [CampanaDto, Object, Object]),
    __metadata("design:returntype", void 0)
], CampaignsController.prototype, "crear", null);
__decorate([
    (0, common_1.Post)(':id/participantes'),
    (0, require_permission_decorator_1.RequirePermission)('patient.write'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, ParticipanteDto, Object, Object]),
    __metadata("design:returntype", void 0)
], CampaignsController.prototype, "registrar", null);
__decorate([
    (0, common_1.Post)(':id/estado'),
    (0, require_permission_decorator_1.RequirePermission)('lead.write'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, EstadoDto, Object, Object]),
    __metadata("design:returntype", void 0)
], CampaignsController.prototype, "estado", null);
exports.CampaignsController = CampaignsController = __decorate([
    (0, common_1.Controller)('campanas'),
    __metadata("design:paramtypes", [campaigns_service_1.CampaignsService])
], CampaignsController);
//# sourceMappingURL=campaigns.controller.js.map