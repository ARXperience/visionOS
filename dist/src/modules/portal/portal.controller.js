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
exports.PortalController = void 0;
const common_1 = require("@nestjs/common");
const class_validator_1 = require("class-validator");
const public_decorator_1 = require("../../common/decorators/public.decorator");
const portal_service_1 = require("./portal.service");
class ConsultaDto {
    codigo;
    ultimos4;
}
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(5),
    (0, class_validator_1.MaxLength)(12),
    __metadata("design:type", String)
], ConsultaDto.prototype, "codigo", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^\d{4}$/),
    __metadata("design:type", String)
], ConsultaDto.prototype, "ultimos4", void 0);
class AccionDto extends ConsultaDto {
    accion;
}
__decorate([
    (0, class_validator_1.IsIn)(['confirmar', 'cancelar']),
    __metadata("design:type", String)
], AccionDto.prototype, "accion", void 0);
let PortalController = class PortalController {
    portal;
    constructor(portal) {
        this.portal = portal;
    }
    consultar(dto, req) {
        return this.portal.consultar(dto.codigo, dto.ultimos4, req.ip ?? 'desconocida');
    }
    responder(dto, req) {
        return this.portal.responder(dto.codigo, dto.ultimos4, dto.accion, req.ip ?? 'desconocida');
    }
};
exports.PortalController = PortalController;
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('consultar'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [ConsultaDto, Object]),
    __metadata("design:returntype", void 0)
], PortalController.prototype, "consultar", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('responder'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [AccionDto, Object]),
    __metadata("design:returntype", void 0)
], PortalController.prototype, "responder", null);
exports.PortalController = PortalController = __decorate([
    (0, common_1.Controller)('portal'),
    __metadata("design:paramtypes", [portal_service_1.PortalService])
], PortalController);
//# sourceMappingURL=portal.controller.js.map