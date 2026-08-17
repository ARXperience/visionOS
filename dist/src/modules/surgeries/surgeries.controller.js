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
exports.SurgeriesController = void 0;
const common_1 = require("@nestjs/common");
const class_validator_1 = require("class-validator");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const require_permission_decorator_1 = require("../../common/decorators/require-permission.decorator");
const lista_oms_1 = require("./lista-oms");
const surgeries_service_1 = require("./surgeries.service");
const OJOS = ['OD', 'OI'];
const ANESTESIA = ['TOPICA', 'LOCAL', 'PERIBULBAR', 'SEDACION', 'GENERAL'];
class ProgramarDto {
    appointmentId;
    laterality;
    surgeonId;
    anesthesiologistId;
    anesthesia;
    teamNotes;
}
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], ProgramarDto.prototype, "appointmentId", void 0);
__decorate([
    (0, class_validator_1.IsIn)(OJOS),
    __metadata("design:type", String)
], ProgramarDto.prototype, "laterality", void 0);
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], ProgramarDto.prototype, "surgeonId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], ProgramarDto.prototype, "anesthesiologistId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(ANESTESIA),
    __metadata("design:type", String)
], ProgramarDto.prototype, "anesthesia", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(500),
    __metadata("design:type", String)
], ProgramarDto.prototype, "teamNotes", void 0);
class ConsentimientoDto {
    fileUrl;
}
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(500),
    __metadata("design:type", String)
], ConsentimientoDto.prototype, "fileUrl", void 0);
class FaseDto {
    respuestas;
    lateralidadConfirmada;
}
__decorate([
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], FaseDto.prototype, "respuestas", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(OJOS),
    __metadata("design:type", String)
], FaseDto.prototype, "lateralidadConfirmada", void 0);
class FinalizarDto {
    findings;
    complications;
}
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(5000),
    __metadata("design:type", String)
], FinalizarDto.prototype, "findings", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(5000),
    __metadata("design:type", String)
], FinalizarDto.prototype, "complications", void 0);
class SuspenderDto {
    motivo;
}
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(5),
    (0, class_validator_1.MaxLength)(300),
    __metadata("design:type", String)
], SuspenderDto.prototype, "motivo", void 0);
class ImplanteDto {
    kind;
    brand;
    model;
    power;
    lot;
    serial;
    invima;
}
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(2),
    (0, class_validator_1.MaxLength)(80),
    __metadata("design:type", String)
], ImplanteDto.prototype, "kind", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(80),
    __metadata("design:type", String)
], ImplanteDto.prototype, "brand", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(80),
    __metadata("design:type", String)
], ImplanteDto.prototype, "model", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(-30),
    (0, class_validator_1.Max)(60),
    __metadata("design:type", Number)
], ImplanteDto.prototype, "power", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(80),
    __metadata("design:type", String)
], ImplanteDto.prototype, "lot", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(80),
    __metadata("design:type", String)
], ImplanteDto.prototype, "serial", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(80),
    __metadata("design:type", String)
], ImplanteDto.prototype, "invima", void 0);
let SurgeriesController = class SurgeriesController {
    cirugias;
    constructor(cirugias) {
        this.cirugias = cirugias;
    }
    ctx(user, req) {
        return { actor: user, ip: req.ip };
    }
    lista() {
        return lista_oms_1.FASES;
    }
    listar(siteId, desde, hasta, status, personId) {
        return this.cirugias.listar({
            siteId,
            status,
            personId,
            desde: desde ? new Date(desde) : undefined,
            hasta: hasta ? new Date(hasta) : undefined,
        });
    }
    indicadores(siteId) {
        return this.cirugias.indicadores(siteId);
    }
    trazabilidad(lot, serial, model) {
        return this.cirugias.trazabilidad({ lot, serial, model });
    }
    ver(id, user, req) {
        return this.cirugias.ver(id, this.ctx(user, req));
    }
    programar(dto, user, req) {
        return this.cirugias.programar(dto, this.ctx(user, req));
    }
    consentimiento(id, dto, user, req) {
        return this.cirugias.registrarConsentimiento(id, dto.fileUrl, this.ctx(user, req));
    }
    fase(id, fase, dto, user, req) {
        const f = fase.toUpperCase();
        return this.cirugias.cerrarFase(id, f, dto.respuestas, dto.lateralidadConfirmada, this.ctx(user, req));
    }
    iniciar(id, user, req) {
        return this.cirugias.iniciar(id, this.ctx(user, req));
    }
    finalizar(id, dto, user, req) {
        return this.cirugias.finalizar(id, dto, this.ctx(user, req));
    }
    suspender(id, dto, user, req) {
        return this.cirugias.suspender(id, dto.motivo, this.ctx(user, req));
    }
    implante(id, dto, user, req) {
        return this.cirugias.registrarImplante(id, dto, this.ctx(user, req));
    }
};
exports.SurgeriesController = SurgeriesController;
__decorate([
    (0, common_1.Get)('lista-verificacion'),
    (0, require_permission_decorator_1.RequirePermission)('patient.read'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], SurgeriesController.prototype, "lista", null);
__decorate([
    (0, common_1.Get)(),
    (0, require_permission_decorator_1.RequirePermission)('patient.read'),
    __param(0, (0, common_1.Query)('siteId')),
    __param(1, (0, common_1.Query)('desde')),
    __param(2, (0, common_1.Query)('hasta')),
    __param(3, (0, common_1.Query)('status')),
    __param(4, (0, common_1.Query)('personId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String]),
    __metadata("design:returntype", void 0)
], SurgeriesController.prototype, "listar", null);
__decorate([
    (0, common_1.Get)('indicadores'),
    (0, require_permission_decorator_1.RequirePermission)('dashboard.read'),
    __param(0, (0, common_1.Query)('siteId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], SurgeriesController.prototype, "indicadores", null);
__decorate([
    (0, common_1.Get)('trazabilidad'),
    (0, require_permission_decorator_1.RequirePermission)('patient.read'),
    __param(0, (0, common_1.Query)('lot')),
    __param(1, (0, common_1.Query)('serial')),
    __param(2, (0, common_1.Query)('model')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], SurgeriesController.prototype, "trazabilidad", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, require_permission_decorator_1.RequirePermission)('patient.read'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], SurgeriesController.prototype, "ver", null);
__decorate([
    (0, common_1.Post)(),
    (0, require_permission_decorator_1.RequirePermission)('patient.write'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [ProgramarDto, Object, Object]),
    __metadata("design:returntype", void 0)
], SurgeriesController.prototype, "programar", null);
__decorate([
    (0, common_1.Post)(':id/consentimiento'),
    (0, require_permission_decorator_1.RequirePermission)('patient.write'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, ConsentimientoDto, Object, Object]),
    __metadata("design:returntype", void 0)
], SurgeriesController.prototype, "consentimiento", null);
__decorate([
    (0, common_1.Post)(':id/verificacion/:fase'),
    (0, require_permission_decorator_1.RequirePermission)('patient.write'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Param)('fase')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, current_user_decorator_1.CurrentUser)()),
    __param(4, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, FaseDto, Object, Object]),
    __metadata("design:returntype", void 0)
], SurgeriesController.prototype, "fase", null);
__decorate([
    (0, common_1.Post)(':id/iniciar'),
    (0, require_permission_decorator_1.RequirePermission)('patient.write'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], SurgeriesController.prototype, "iniciar", null);
__decorate([
    (0, common_1.Post)(':id/finalizar'),
    (0, require_permission_decorator_1.RequirePermission)('patient.write'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, FinalizarDto, Object, Object]),
    __metadata("design:returntype", void 0)
], SurgeriesController.prototype, "finalizar", null);
__decorate([
    (0, common_1.Post)(':id/suspender'),
    (0, require_permission_decorator_1.RequirePermission)('patient.write'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, SuspenderDto, Object, Object]),
    __metadata("design:returntype", void 0)
], SurgeriesController.prototype, "suspender", null);
__decorate([
    (0, common_1.Post)(':id/implantes'),
    (0, require_permission_decorator_1.RequirePermission)('patient.write'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, ImplanteDto, Object, Object]),
    __metadata("design:returntype", void 0)
], SurgeriesController.prototype, "implante", null);
exports.SurgeriesController = SurgeriesController = __decorate([
    (0, common_1.Controller)('cirugias'),
    __metadata("design:paramtypes", [surgeries_service_1.SurgeriesService])
], SurgeriesController);
//# sourceMappingURL=surgeries.controller.js.map