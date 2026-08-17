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
exports.BillingController = void 0;
const common_1 = require("@nestjs/common");
const class_validator_1 = require("class-validator");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const require_permission_decorator_1 = require("../../common/decorators/require-permission.decorator");
const billing_service_1 = require("./billing.service");
const MEDIOS = [
    'EFECTIVO',
    'TARJETA_DEBITO',
    'TARJETA_CREDITO',
    'TRANSFERENCIA',
    'PSE',
    'BONO',
    'OTRO',
];
class CrearDto {
    personId;
    siteId;
    payerId;
    notes;
}
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CrearDto.prototype, "personId", void 0);
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CrearDto.prototype, "siteId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CrearDto.prototype, "payerId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(1000),
    __metadata("design:type", String)
], CrearDto.prototype, "notes", void 0);
class ItemDto {
    serviceId;
    quantity;
    unitPrice;
    discount;
    appointmentId;
}
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], ItemDto.prototype, "serviceId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Number)
], ItemDto.prototype, "quantity", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], ItemDto.prototype, "unitPrice", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], ItemDto.prototype, "discount", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], ItemDto.prototype, "appointmentId", void 0);
class EmitirDto {
    diasPlazo;
}
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(365),
    __metadata("design:type", Number)
], EmitirDto.prototype, "diasPlazo", void 0);
class PagoDto {
    amount;
    method;
    reference;
    notes;
}
__decorate([
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], PagoDto.prototype, "amount", void 0);
__decorate([
    (0, class_validator_1.IsIn)(MEDIOS),
    __metadata("design:type", String)
], PagoDto.prototype, "method", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], PagoDto.prototype, "reference", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(500),
    __metadata("design:type", String)
], PagoDto.prototype, "notes", void 0);
class AnularDto {
    motivo;
}
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(5),
    (0, class_validator_1.MaxLength)(300),
    __metadata("design:type", String)
], AnularDto.prototype, "motivo", void 0);
class RadicarDto {
    numero;
}
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(2),
    (0, class_validator_1.MaxLength)(60),
    __metadata("design:type", String)
], RadicarDto.prototype, "numero", void 0);
class GlosaDto {
    code;
    reason;
    amount;
}
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(1),
    (0, class_validator_1.MaxLength)(20),
    __metadata("design:type", String)
], GlosaDto.prototype, "code", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(5),
    (0, class_validator_1.MaxLength)(1000),
    __metadata("design:type", String)
], GlosaDto.prototype, "reason", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], GlosaDto.prototype, "amount", void 0);
class RespuestaGlosaDto {
    answer;
    acceptedAmount;
}
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(5),
    (0, class_validator_1.MaxLength)(3000),
    __metadata("design:type", String)
], RespuestaGlosaDto.prototype, "answer", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], RespuestaGlosaDto.prototype, "acceptedAmount", void 0);
let BillingController = class BillingController {
    facturacion;
    constructor(facturacion) {
        this.facturacion = facturacion;
    }
    ctx(user, req) {
        return { actor: user, ip: req.ip };
    }
    listar(status, personId, payerId, siteId) {
        return this.facturacion.listar({ status, personId, payerId, siteId });
    }
    cartera(payerId) {
        return this.facturacion.cartera(payerId);
    }
    crear(dto, user, req) {
        return this.facturacion.crear(dto, this.ctx(user, req));
    }
    agregarItem(id, dto, user, req) {
        return this.facturacion.agregarItem(id, dto, this.ctx(user, req));
    }
    quitarItem(itemId, user, req) {
        return this.facturacion.quitarItem(itemId, this.ctx(user, req));
    }
    emitir(id, dto, user, req) {
        return this.facturacion.emitir(id, dto.diasPlazo, this.ctx(user, req));
    }
    anular(id, dto, user, req) {
        return this.facturacion.anular(id, dto.motivo, this.ctx(user, req));
    }
    pagar(id, dto, user, req) {
        return this.facturacion.registrarPago(id, dto, this.ctx(user, req));
    }
    radicar(id, dto, user, req) {
        return this.facturacion.radicar(id, dto.numero, this.ctx(user, req));
    }
    glosa(id, dto, user, req) {
        return this.facturacion.registrarGlosa(id, dto, this.ctx(user, req));
    }
    responderGlosa(glosaId, dto, user, req) {
        return this.facturacion.responderGlosa(glosaId, dto, this.ctx(user, req));
    }
};
exports.BillingController = BillingController;
__decorate([
    (0, common_1.Get)(),
    (0, require_permission_decorator_1.RequirePermission)('patient.read'),
    __param(0, (0, common_1.Query)('status')),
    __param(1, (0, common_1.Query)('personId')),
    __param(2, (0, common_1.Query)('payerId')),
    __param(3, (0, common_1.Query)('siteId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", void 0)
], BillingController.prototype, "listar", null);
__decorate([
    (0, common_1.Get)('cartera'),
    (0, require_permission_decorator_1.RequirePermission)('dashboard.read'),
    __param(0, (0, common_1.Query)('payerId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], BillingController.prototype, "cartera", null);
__decorate([
    (0, common_1.Post)(),
    (0, require_permission_decorator_1.RequirePermission)('patient.write'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [CrearDto, Object, Object]),
    __metadata("design:returntype", void 0)
], BillingController.prototype, "crear", null);
__decorate([
    (0, common_1.Post)(':id/items'),
    (0, require_permission_decorator_1.RequirePermission)('patient.write'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, ItemDto, Object, Object]),
    __metadata("design:returntype", void 0)
], BillingController.prototype, "agregarItem", null);
__decorate([
    (0, common_1.Delete)('items/:itemId'),
    (0, require_permission_decorator_1.RequirePermission)('patient.write'),
    __param(0, (0, common_1.Param)('itemId', common_1.ParseUUIDPipe)),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], BillingController.prototype, "quitarItem", null);
__decorate([
    (0, common_1.Post)(':id/emitir'),
    (0, require_permission_decorator_1.RequirePermission)('patient.write'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, EmitirDto, Object, Object]),
    __metadata("design:returntype", void 0)
], BillingController.prototype, "emitir", null);
__decorate([
    (0, common_1.Post)(':id/anular'),
    (0, require_permission_decorator_1.RequirePermission)('patient.write'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, AnularDto, Object, Object]),
    __metadata("design:returntype", void 0)
], BillingController.prototype, "anular", null);
__decorate([
    (0, common_1.Post)(':id/pagos'),
    (0, require_permission_decorator_1.RequirePermission)('patient.write'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, PagoDto, Object, Object]),
    __metadata("design:returntype", void 0)
], BillingController.prototype, "pagar", null);
__decorate([
    (0, common_1.Post)(':id/radicar'),
    (0, require_permission_decorator_1.RequirePermission)('patient.write'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, RadicarDto, Object, Object]),
    __metadata("design:returntype", void 0)
], BillingController.prototype, "radicar", null);
__decorate([
    (0, common_1.Post)(':id/glosas'),
    (0, require_permission_decorator_1.RequirePermission)('patient.write'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, GlosaDto, Object, Object]),
    __metadata("design:returntype", void 0)
], BillingController.prototype, "glosa", null);
__decorate([
    (0, common_1.Post)('glosas/:glosaId/responder'),
    (0, require_permission_decorator_1.RequirePermission)('patient.write'),
    __param(0, (0, common_1.Param)('glosaId', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, RespuestaGlosaDto, Object, Object]),
    __metadata("design:returntype", void 0)
], BillingController.prototype, "responderGlosa", null);
exports.BillingController = BillingController = __decorate([
    (0, common_1.Controller)('facturacion'),
    __metadata("design:paramtypes", [billing_service_1.BillingService])
], BillingController);
//# sourceMappingURL=billing.controller.js.map