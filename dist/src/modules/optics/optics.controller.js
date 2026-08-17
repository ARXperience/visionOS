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
exports.OpticsController = void 0;
const common_1 = require("@nestjs/common");
const class_validator_1 = require("class-validator");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const require_permission_decorator_1 = require("../../common/decorators/require-permission.decorator");
const optics_service_1 = require("./optics.service");
class FormulaDto {
    personId;
    professionalId;
    appointmentId;
    mesesVigencia;
    odSphere;
    odCylinder;
    odAxis;
    odAdd;
    oiSphere;
    oiCylinder;
    oiAxis;
    oiAdd;
    pupillaryDistance;
    lensType;
    notes;
}
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], FormulaDto.prototype, "personId", void 0);
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], FormulaDto.prototype, "professionalId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], FormulaDto.prototype, "appointmentId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(60),
    __metadata("design:type", Number)
], FormulaDto.prototype, "mesesVigencia", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(-30),
    (0, class_validator_1.Max)(30),
    __metadata("design:type", Number)
], FormulaDto.prototype, "odSphere", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(-12),
    (0, class_validator_1.Max)(12),
    __metadata("design:type", Number)
], FormulaDto.prototype, "odCylinder", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(180),
    __metadata("design:type", Number)
], FormulaDto.prototype, "odAxis", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(6),
    __metadata("design:type", Number)
], FormulaDto.prototype, "odAdd", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(-30),
    (0, class_validator_1.Max)(30),
    __metadata("design:type", Number)
], FormulaDto.prototype, "oiSphere", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(-12),
    (0, class_validator_1.Max)(12),
    __metadata("design:type", Number)
], FormulaDto.prototype, "oiCylinder", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(180),
    __metadata("design:type", Number)
], FormulaDto.prototype, "oiAxis", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(6),
    __metadata("design:type", Number)
], FormulaDto.prototype, "oiAdd", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(40),
    (0, class_validator_1.Max)(80),
    __metadata("design:type", Number)
], FormulaDto.prototype, "pupillaryDistance", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(60),
    __metadata("design:type", String)
], FormulaDto.prototype, "lensType", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(1000),
    __metadata("design:type", String)
], FormulaDto.prototype, "notes", void 0);
class OrdenDto {
    prescriptionId;
    siteId;
    frameProductId;
    frameOwn;
    frameNote;
    lensProductId;
    lensNote;
    lab;
    promisedAt;
    price;
    warrantyMonths;
}
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], OrdenDto.prototype, "prescriptionId", void 0);
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], OrdenDto.prototype, "siteId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], OrdenDto.prototype, "frameProductId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], OrdenDto.prototype, "frameOwn", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(200),
    __metadata("design:type", String)
], OrdenDto.prototype, "frameNote", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], OrdenDto.prototype, "lensProductId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(200),
    __metadata("design:type", String)
], OrdenDto.prototype, "lensNote", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(120),
    __metadata("design:type", String)
], OrdenDto.prototype, "lab", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], OrdenDto.prototype, "promisedAt", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], OrdenDto.prototype, "price", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(60),
    __metadata("design:type", Number)
], OrdenDto.prototype, "warrantyMonths", void 0);
class LaboratorioDto {
    lab;
    promisedAt;
}
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(2),
    (0, class_validator_1.MaxLength)(120),
    __metadata("design:type", String)
], LaboratorioDto.prototype, "lab", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], LaboratorioDto.prototype, "promisedAt", void 0);
class EntregaDto {
    deliveredTo;
}
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(160),
    __metadata("design:type", String)
], EntregaDto.prototype, "deliveredTo", void 0);
class AnularDto {
    motivo;
}
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(5),
    (0, class_validator_1.MaxLength)(300),
    __metadata("design:type", String)
], AnularDto.prototype, "motivo", void 0);
let OpticsController = class OpticsController {
    optica;
    constructor(optica) {
        this.optica = optica;
    }
    ctx(user, req) {
        return { actor: user, ip: req.ip };
    }
    ordenes(status, siteId, personId) {
        return this.optica.ordenes({ status, siteId, personId });
    }
    formulas(personId) {
        return this.optica.formulas(personId);
    }
    emitir(dto, user, req) {
        return this.optica.emitirFormula(dto, this.ctx(user, req));
    }
    crear(dto, user, req) {
        return this.optica.crearOrden({ ...dto, promisedAt: dto.promisedAt ? new Date(dto.promisedAt) : undefined }, this.ctx(user, req));
    }
    enviar(id, dto, user, req) {
        return this.optica.enviarALaboratorio(id, dto.lab, dto.promisedAt ? new Date(dto.promisedAt) : undefined, this.ctx(user, req));
    }
    recibir(id, user, req) {
        return this.optica.recibirDeLaboratorio(id, this.ctx(user, req));
    }
    entregar(id, dto, user, req) {
        return this.optica.entregar(id, dto.deliveredTo, this.ctx(user, req));
    }
    anular(id, dto, user, req) {
        return this.optica.anular(id, dto.motivo, this.ctx(user, req));
    }
};
exports.OpticsController = OpticsController;
__decorate([
    (0, common_1.Get)('ordenes'),
    (0, require_permission_decorator_1.RequirePermission)('patient.read'),
    __param(0, (0, common_1.Query)('status')),
    __param(1, (0, common_1.Query)('siteId')),
    __param(2, (0, common_1.Query)('personId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], OpticsController.prototype, "ordenes", null);
__decorate([
    (0, common_1.Get)('formulas/:personId'),
    (0, require_permission_decorator_1.RequirePermission)('patient.read'),
    __param(0, (0, common_1.Param)('personId', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], OpticsController.prototype, "formulas", null);
__decorate([
    (0, common_1.Post)('formulas'),
    (0, require_permission_decorator_1.RequirePermission)('patient.write'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [FormulaDto, Object, Object]),
    __metadata("design:returntype", void 0)
], OpticsController.prototype, "emitir", null);
__decorate([
    (0, common_1.Post)('ordenes'),
    (0, require_permission_decorator_1.RequirePermission)('patient.write'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [OrdenDto, Object, Object]),
    __metadata("design:returntype", void 0)
], OpticsController.prototype, "crear", null);
__decorate([
    (0, common_1.Post)('ordenes/:id/laboratorio'),
    (0, require_permission_decorator_1.RequirePermission)('patient.write'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, LaboratorioDto, Object, Object]),
    __metadata("design:returntype", void 0)
], OpticsController.prototype, "enviar", null);
__decorate([
    (0, common_1.Post)('ordenes/:id/recibir'),
    (0, require_permission_decorator_1.RequirePermission)('patient.write'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], OpticsController.prototype, "recibir", null);
__decorate([
    (0, common_1.Post)('ordenes/:id/entregar'),
    (0, require_permission_decorator_1.RequirePermission)('patient.write'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, EntregaDto, Object, Object]),
    __metadata("design:returntype", void 0)
], OpticsController.prototype, "entregar", null);
__decorate([
    (0, common_1.Post)('ordenes/:id/anular'),
    (0, require_permission_decorator_1.RequirePermission)('patient.write'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, AnularDto, Object, Object]),
    __metadata("design:returntype", void 0)
], OpticsController.prototype, "anular", null);
exports.OpticsController = OpticsController = __decorate([
    (0, common_1.Controller)('optica'),
    __metadata("design:paramtypes", [optics_service_1.OpticsService])
], OpticsController);
//# sourceMappingURL=optics.controller.js.map