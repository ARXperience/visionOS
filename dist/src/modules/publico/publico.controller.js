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
exports.PublicoController = void 0;
const common_1 = require("@nestjs/common");
const throttler_1 = require("@nestjs/throttler");
const class_validator_1 = require("class-validator");
const public_decorator_1 = require("../../common/decorators/public.decorator");
const pqrsf_service_1 = require("../pqrsf/pqrsf.service");
const publico_service_1 = require("./publico.service");
const TIPOS = ['PETICION', 'QUEJA', 'RECLAMO', 'SUGERENCIA', 'FELICITACION'];
class SolicitudDto {
    nombre;
    telefono;
    correo;
    autorizacion;
    sede;
    servicio;
    mensaje;
    nit;
}
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(3),
    (0, class_validator_1.MaxLength)(120),
    __metadata("design:type", String)
], SolicitudDto.prototype, "nombre", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(7),
    (0, class_validator_1.MaxLength)(25),
    __metadata("design:type", String)
], SolicitudDto.prototype, "telefono", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEmail)(),
    (0, class_validator_1.MaxLength)(160),
    __metadata("design:type", String)
], SolicitudDto.prototype, "correo", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], SolicitudDto.prototype, "autorizacion", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(30),
    __metadata("design:type", String)
], SolicitudDto.prototype, "sede", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(80),
    __metadata("design:type", String)
], SolicitudDto.prototype, "servicio", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(1000),
    __metadata("design:type", String)
], SolicitudDto.prototype, "mensaje", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(200),
    __metadata("design:type", String)
], SolicitudDto.prototype, "nit", void 0);
class PqrsfDto {
    tipo;
    nombre;
    contacto;
    asunto;
    detalle;
    nit;
}
__decorate([
    (0, class_validator_1.IsIn)(TIPOS),
    __metadata("design:type", String)
], PqrsfDto.prototype, "tipo", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(3),
    (0, class_validator_1.MaxLength)(120),
    __metadata("design:type", String)
], PqrsfDto.prototype, "nombre", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(5),
    (0, class_validator_1.MaxLength)(120),
    __metadata("design:type", String)
], PqrsfDto.prototype, "contacto", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(4),
    (0, class_validator_1.MaxLength)(200),
    __metadata("design:type", String)
], PqrsfDto.prototype, "asunto", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(10),
    (0, class_validator_1.MaxLength)(5000),
    __metadata("design:type", String)
], PqrsfDto.prototype, "detalle", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(200),
    __metadata("design:type", String)
], PqrsfDto.prototype, "nit", void 0);
let PublicoController = class PublicoController {
    publico;
    pqrsf;
    constructor(publico, pqrsf) {
        this.publico = publico;
        this.pqrsf = pqrsf;
    }
    sedes() {
        return this.publico.sedes();
    }
    servicios() {
        return this.publico.servicios();
    }
    solicitar(dto, req) {
        if (!dto.autorizacion) {
            throw new common_1.BadRequestException('Falta autorizar el tratamiento de sus datos: sin eso no podemos guardarlos ni llamarlo.');
        }
        if (dto.nit) {
            return {
                radicado: null,
                mensaje: 'Recibimos su solicitud. Un asesor se comunica con usted en horario hábil.',
            };
        }
        return this.publico.solicitar(dto, req.ip ?? null, req.headers['user-agent'] ?? null);
    }
    async radicarPqrsf(dto, req) {
        if (dto.nit)
            return { radicado: 'PQR-0000-0000', dueDate: null };
        const p = await this.pqrsf.radicar({
            tipo: dto.tipo,
            asunto: dto.asunto,
            detalle: dto.detalle,
            nombre: dto.nombre,
            contacto: dto.contacto,
        }, { actor: null, ip: req.ip ?? null });
        return { radicado: p.radicado, dueDate: p.dueDate };
    }
};
exports.PublicoController = PublicoController;
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)('sedes'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], PublicoController.prototype, "sedes", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)('servicios'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], PublicoController.prototype, "servicios", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, throttler_1.Throttle)({ default: { limit: 6, ttl: 3_600_000 } }),
    (0, common_1.Post)('solicitudes'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [SolicitudDto, Object]),
    __metadata("design:returntype", void 0)
], PublicoController.prototype, "solicitar", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, throttler_1.Throttle)({ default: { limit: 4, ttl: 3_600_000 } }),
    (0, common_1.Post)('pqrsf'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [PqrsfDto, Object]),
    __metadata("design:returntype", Promise)
], PublicoController.prototype, "radicarPqrsf", null);
exports.PublicoController = PublicoController = __decorate([
    (0, common_1.Controller)('publico'),
    __metadata("design:paramtypes", [publico_service_1.PublicoService,
        pqrsf_service_1.PqrsfService])
], PublicoController);
//# sourceMappingURL=publico.controller.js.map