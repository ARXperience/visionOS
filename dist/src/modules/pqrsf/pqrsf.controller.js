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
exports.PqrsfController = void 0;
const common_1 = require("@nestjs/common");
const class_validator_1 = require("class-validator");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const require_permission_decorator_1 = require("../../common/decorators/require-permission.decorator");
const pqrsf_service_1 = require("./pqrsf.service");
const TIPOS = ['PETICION', 'QUEJA', 'RECLAMO', 'SUGERENCIA', 'FELICITACION'];
const ESTADOS = ['RADICADA', 'EN_GESTION', 'RESPONDIDA', 'CERRADA'];
class RadicarDto {
    tipo;
    asunto;
    detalle;
    personId;
    nombre;
    contacto;
    siteId;
    serviceId;
}
__decorate([
    (0, class_validator_1.IsIn)(TIPOS),
    __metadata("design:type", String)
], RadicarDto.prototype, "tipo", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(4),
    (0, class_validator_1.MaxLength)(200),
    __metadata("design:type", String)
], RadicarDto.prototype, "asunto", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(10),
    (0, class_validator_1.MaxLength)(5000),
    __metadata("design:type", String)
], RadicarDto.prototype, "detalle", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], RadicarDto.prototype, "personId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(120),
    __metadata("design:type", String)
], RadicarDto.prototype, "nombre", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(120),
    __metadata("design:type", String)
], RadicarDto.prototype, "contacto", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], RadicarDto.prototype, "siteId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], RadicarDto.prototype, "serviceId", void 0);
class AsignarDto {
    userId;
}
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], AsignarDto.prototype, "userId", void 0);
class ResponderDto {
    respuesta;
}
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(10),
    (0, class_validator_1.MaxLength)(10_000),
    __metadata("design:type", String)
], ResponderDto.prototype, "respuesta", void 0);
class CerrarDto {
    satisfaccion;
}
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(5),
    __metadata("design:type", Number)
], CerrarDto.prototype, "satisfaccion", void 0);
let PqrsfController = class PqrsfController {
    pqrsf;
    constructor(pqrsf) {
        this.pqrsf = pqrsf;
    }
    ctx(user, req) {
        return { actor: user, ip: req.ip ?? null };
    }
    listar(estado, vencidas, personId) {
        return this.pqrsf.listar({
            estado: ESTADOS.includes(estado) ? estado : undefined,
            vencidas: vencidas === 'true',
            personId,
        });
    }
    indicadores() {
        return this.pqrsf.indicadores();
    }
    radicar(dto, user, req) {
        return this.pqrsf.radicar(dto, this.ctx(user, req));
    }
    asignar(id, dto, user, req) {
        return this.pqrsf.asignar(id, dto.userId, this.ctx(user, req));
    }
    responder(id, dto, user, req) {
        return this.pqrsf.responder(id, dto.respuesta, this.ctx(user, req));
    }
    cerrar(id, dto, user, req) {
        return this.pqrsf.cerrar(id, dto.satisfaccion, this.ctx(user, req));
    }
};
exports.PqrsfController = PqrsfController;
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('patient.read'),
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('estado')),
    __param(1, (0, common_1.Query)('vencidas')),
    __param(2, (0, common_1.Query)('personId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], PqrsfController.prototype, "listar", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('patient.read'),
    (0, common_1.Get)('indicadores'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], PqrsfController.prototype, "indicadores", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('patient.write'),
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [RadicarDto, Object, Object]),
    __metadata("design:returntype", void 0)
], PqrsfController.prototype, "radicar", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('patient.write'),
    (0, common_1.Post)(':id/asignar'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, AsignarDto, Object, Object]),
    __metadata("design:returntype", void 0)
], PqrsfController.prototype, "asignar", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('patient.write'),
    (0, common_1.Post)(':id/responder'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, ResponderDto, Object, Object]),
    __metadata("design:returntype", void 0)
], PqrsfController.prototype, "responder", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('patient.write'),
    (0, common_1.Post)(':id/cerrar'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, CerrarDto, Object, Object]),
    __metadata("design:returntype", void 0)
], PqrsfController.prototype, "cerrar", null);
exports.PqrsfController = PqrsfController = __decorate([
    (0, common_1.Controller)('pqrsf'),
    __metadata("design:paramtypes", [pqrsf_service_1.PqrsfService])
], PqrsfController);
//# sourceMappingURL=pqrsf.controller.js.map