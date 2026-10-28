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
exports.OrdersController = void 0;
const common_1 = require("@nestjs/common");
const class_validator_1 = require("class-validator");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const require_permission_decorator_1 = require("../../common/decorators/require-permission.decorator");
const orders_service_1 = require("./orders.service");
const ESTADOS = ['PENDIENTE', 'AUTORIZADA', 'AGENDADA', 'REALIZADA', 'INFORMADA', 'ANULADA', 'VENCIDA'];
class CrearOrdenDto {
    personId;
    serviceId;
    laterality;
    originAppointmentId;
    orderedByProfessionalId;
    indications;
    externalOrderUrl;
    vigenciaDias;
}
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CrearOrdenDto.prototype, "personId", void 0);
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CrearOrdenDto.prototype, "serviceId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(['OD', 'OI', 'AO', 'NA']),
    __metadata("design:type", String)
], CrearOrdenDto.prototype, "laterality", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CrearOrdenDto.prototype, "originAppointmentId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CrearOrdenDto.prototype, "orderedByProfessionalId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(1000),
    __metadata("design:type", String)
], CrearOrdenDto.prototype, "indications", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(500),
    __metadata("design:type", String)
], CrearOrdenDto.prototype, "externalOrderUrl", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(365),
    __metadata("design:type", Number)
], CrearOrdenDto.prototype, "vigenciaDias", void 0);
class AutorizarDto {
    numero;
}
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(3),
    (0, class_validator_1.MaxLength)(60),
    __metadata("design:type", String)
], AutorizarDto.prototype, "numero", void 0);
class ResultadoDto {
    fileUrl;
    fileName;
    mimeType;
    sizeBytes;
    sha256;
    contenidoBase64;
    reportText;
    performedById;
    equipmentId;
    isFinal;
}
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(1000),
    __metadata("design:type", String)
], ResultadoDto.prototype, "fileUrl", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(200),
    __metadata("design:type", String)
], ResultadoDto.prototype, "fileName", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], ResultadoDto.prototype, "mimeType", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], ResultadoDto.prototype, "sizeBytes", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^[a-f0-9]{64}$/i),
    __metadata("design:type", String)
], ResultadoDto.prototype, "sha256", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ResultadoDto.prototype, "contenidoBase64", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(20_000),
    __metadata("design:type", String)
], ResultadoDto.prototype, "reportText", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], ResultadoDto.prototype, "performedById", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], ResultadoDto.prototype, "equipmentId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], ResultadoDto.prototype, "isFinal", void 0);
class AnularDto {
    motivo;
}
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(3),
    (0, class_validator_1.MaxLength)(300),
    __metadata("design:type", String)
], AnularDto.prototype, "motivo", void 0);
let OrdersController = class OrdersController {
    ordenes;
    constructor(ordenes) {
        this.ordenes = ordenes;
    }
    ctx(user, req) {
        return { actor: user, ip: req.ip ?? null };
    }
    listar(estado, personId, vencidas) {
        return this.ordenes.listar({
            estado: ESTADOS.includes(estado) ? estado : undefined,
            personId,
            vencidas: vencidas === 'true',
        });
    }
    pendientes() {
        return this.ordenes.pendientes();
    }
    crear(dto, user, req) {
        return this.ordenes.crear(dto, this.ctx(user, req));
    }
    autorizar(id, dto, user, req) {
        return this.ordenes.autorizar(id, dto.numero, this.ctx(user, req));
    }
    resultado(id, dto, user, req) {
        return this.ordenes.adjuntarResultado(id, dto, this.ctx(user, req));
    }
    verResultado(id, user, req) {
        return this.ordenes.verResultado(id, this.ctx(user, req));
    }
    anular(id, dto, user, req) {
        return this.ordenes.anular(id, dto.motivo, this.ctx(user, req));
    }
};
exports.OrdersController = OrdersController;
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('patient.read'),
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('estado')),
    __param(1, (0, common_1.Query)('personId')),
    __param(2, (0, common_1.Query)('vencidas')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], OrdersController.prototype, "listar", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('patient.read'),
    (0, common_1.Get)('pendientes'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], OrdersController.prototype, "pendientes", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('patient.write'),
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [CrearOrdenDto, Object, Object]),
    __metadata("design:returntype", void 0)
], OrdersController.prototype, "crear", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('patient.write'),
    (0, common_1.Post)(':id/autorizar'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, AutorizarDto, Object, Object]),
    __metadata("design:returntype", void 0)
], OrdersController.prototype, "autorizar", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('patient.write'),
    (0, common_1.Post)(':id/resultado'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, ResultadoDto, Object, Object]),
    __metadata("design:returntype", void 0)
], OrdersController.prototype, "resultado", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('patient.read'),
    (0, common_1.Get)('resultados/:id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], OrdersController.prototype, "verResultado", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('patient.write'),
    (0, common_1.Post)(':id/anular'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, AnularDto, Object, Object]),
    __metadata("design:returntype", void 0)
], OrdersController.prototype, "anular", null);
exports.OrdersController = OrdersController = __decorate([
    (0, common_1.Controller)('ordenes'),
    __metadata("design:paramtypes", [orders_service_1.OrdersService])
], OrdersController);
//# sourceMappingURL=orders.controller.js.map