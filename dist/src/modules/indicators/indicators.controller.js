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
exports.IndicatorsController = void 0;
const common_1 = require("@nestjs/common");
const require_permission_decorator_1 = require("../../common/decorators/require-permission.decorator");
const indicators_service_1 = require("./indicators.service");
let IndicatorsController = class IndicatorsController {
    indicadores;
    constructor(indicadores) {
        this.indicadores = indicadores;
    }
    mensual(desde, hasta, siteId) {
        const hoy = new Date();
        const d = desde ? new Date(desde) : new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), 1));
        const h = hasta ? new Date(hasta) : hoy;
        return this.indicadores.mensual(d, h, siteId);
    }
    tendencia(meses, siteId) {
        return this.indicadores.tendencia(Math.min(Number(meses) || 6, 24), siteId);
    }
};
exports.IndicatorsController = IndicatorsController;
__decorate([
    (0, common_1.Get)(),
    (0, require_permission_decorator_1.RequirePermission)('dashboard.read'),
    __param(0, (0, common_1.Query)('desde')),
    __param(1, (0, common_1.Query)('hasta')),
    __param(2, (0, common_1.Query)('siteId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], IndicatorsController.prototype, "mensual", null);
__decorate([
    (0, common_1.Get)('tendencia'),
    (0, require_permission_decorator_1.RequirePermission)('dashboard.read'),
    __param(0, (0, common_1.Query)('meses')),
    __param(1, (0, common_1.Query)('siteId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], IndicatorsController.prototype, "tendencia", null);
exports.IndicatorsController = IndicatorsController = __decorate([
    (0, common_1.Controller)('indicadores'),
    __metadata("design:paramtypes", [indicators_service_1.IndicatorsService])
], IndicatorsController);
//# sourceMappingURL=indicators.controller.js.map