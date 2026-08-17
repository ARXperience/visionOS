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
exports.ProfessionalsController = void 0;
const common_1 = require("@nestjs/common");
const class_validator_1 = require("class-validator");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const require_permission_decorator_1 = require("../../common/decorators/require-permission.decorator");
const professionals_service_1 = require("./professionals.service");
const TIPOS = [
    'OFTALMOLOGO', 'OPTOMETRA', 'ORTOPTISTA', 'ANESTESIOLOGO', 'ENFERMERIA', 'ESTETICA', 'OTRO',
];
const HORA = /^([01]\d|2[0-3]):([0-5]\d)$/;
class CrearDto {
    docNumber;
    firstName;
    lastName;
    type;
    licenseNumber;
    specialties;
    color;
    siteIds;
}
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(4),
    (0, class_validator_1.MaxLength)(20),
    __metadata("design:type", String)
], CrearDto.prototype, "docNumber", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(2),
    (0, class_validator_1.MaxLength)(60),
    __metadata("design:type", String)
], CrearDto.prototype, "firstName", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(2),
    (0, class_validator_1.MaxLength)(60),
    __metadata("design:type", String)
], CrearDto.prototype, "lastName", void 0);
__decorate([
    (0, class_validator_1.IsIn)(TIPOS),
    __metadata("design:type", String)
], CrearDto.prototype, "type", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(40),
    __metadata("design:type", String)
], CrearDto.prototype, "licenseNumber", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], CrearDto.prototype, "specialties", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^#[0-9a-f]{6}$/i),
    __metadata("design:type", String)
], CrearDto.prototype, "color", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ArrayNotEmpty)({ message: 'Asigne al menos una sede' }),
    (0, class_validator_1.IsUUID)('4', { each: true }),
    __metadata("design:type", Array)
], CrearDto.prototype, "siteIds", void 0);
class ServiciosDto {
    serviceIds;
}
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsUUID)('4', { each: true }),
    __metadata("design:type", Array)
], ServiciosDto.prototype, "serviceIds", void 0);
class FranjaDto {
    siteId;
    weekday;
    inicio;
    fin;
}
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], FranjaDto.prototype, "siteId", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(6),
    __metadata("design:type", Number)
], FranjaDto.prototype, "weekday", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(HORA, { message: 'Formato HH:MM' }),
    __metadata("design:type", String)
], FranjaDto.prototype, "inicio", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(HORA, { message: 'Formato HH:MM' }),
    __metadata("design:type", String)
], FranjaDto.prototype, "fin", void 0);
class BloqueoDto {
    siteId;
    desde;
    hasta;
    motivo;
}
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], BloqueoDto.prototype, "siteId", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], BloqueoDto.prototype, "desde", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], BloqueoDto.prototype, "hasta", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(3),
    (0, class_validator_1.MaxLength)(120),
    __metadata("design:type", String)
], BloqueoDto.prototype, "motivo", void 0);
class EstadoDto {
    activo;
}
__decorate([
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], EstadoDto.prototype, "activo", void 0);
let ProfessionalsController = class ProfessionalsController {
    profesionales;
    constructor(profesionales) {
        this.profesionales = profesionales;
    }
    ctx(user, req) {
        return { actor: user, ip: req.ip ?? null };
    }
    listar() {
        return this.profesionales.listar();
    }
    crear(dto, user, req) {
        return this.profesionales.crear(dto, this.ctx(user, req));
    }
    servicios(id, dto, user, req) {
        return this.profesionales.asignarServicios(id, dto.serviceIds, this.ctx(user, req));
    }
    franja(id, dto, user, req) {
        return this.profesionales.agregarFranja({ professionalId: id, ...dto }, this.ctx(user, req));
    }
    quitarFranja(id, user, req) {
        return this.profesionales.quitarFranja(id, this.ctx(user, req));
    }
    bloqueos(id) {
        return this.profesionales.bloqueos(id);
    }
    bloquear(id, dto, user, req) {
        return this.profesionales.bloquear({ professionalId: id, ...dto }, this.ctx(user, req));
    }
    quitarBloqueo(id) {
        return this.profesionales.quitarBloqueo(id);
    }
    estado(id, dto, user, req) {
        return this.profesionales.cambiarEstado(id, dto.activo, this.ctx(user, req));
    }
};
exports.ProfessionalsController = ProfessionalsController;
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('site.read'),
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ProfessionalsController.prototype, "listar", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('schedule.manage'),
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [CrearDto, Object, Object]),
    __metadata("design:returntype", void 0)
], ProfessionalsController.prototype, "crear", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('schedule.manage'),
    (0, common_1.Post)(':id/servicios'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, ServiciosDto, Object, Object]),
    __metadata("design:returntype", void 0)
], ProfessionalsController.prototype, "servicios", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('schedule.manage'),
    (0, common_1.Post)(':id/franjas'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, FranjaDto, Object, Object]),
    __metadata("design:returntype", void 0)
], ProfessionalsController.prototype, "franja", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('schedule.manage'),
    (0, common_1.Delete)('franjas/:id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], ProfessionalsController.prototype, "quitarFranja", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('site.read'),
    (0, common_1.Get)(':id/bloqueos'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ProfessionalsController.prototype, "bloqueos", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('schedule.manage'),
    (0, common_1.Post)(':id/bloqueos'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, BloqueoDto, Object, Object]),
    __metadata("design:returntype", void 0)
], ProfessionalsController.prototype, "bloquear", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('schedule.manage'),
    (0, common_1.Delete)('bloqueos/:id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ProfessionalsController.prototype, "quitarBloqueo", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('schedule.manage'),
    (0, common_1.Post)(':id/estado'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, EstadoDto, Object, Object]),
    __metadata("design:returntype", void 0)
], ProfessionalsController.prototype, "estado", null);
exports.ProfessionalsController = ProfessionalsController = __decorate([
    (0, common_1.Controller)('profesionales'),
    __metadata("design:paramtypes", [professionals_service_1.ProfessionalsService])
], ProfessionalsController);
//# sourceMappingURL=professionals.controller.js.map