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
exports.AutomationsController = void 0;
const common_1 = require("@nestjs/common");
const require_permission_decorator_1 = require("../../common/decorators/require-permission.decorator");
const automations_service_1 = require("./automations.service");
let AutomationsController = class AutomationsController {
    automatizaciones;
    constructor(automatizaciones) {
        this.automatizaciones = automatizaciones;
    }
    estado() {
        return this.automatizaciones.estado();
    }
    envios(limite) {
        return this.automatizaciones.ultimos(Math.min(Number(limite) || 50, 200));
    }
};
exports.AutomationsController = AutomationsController;
__decorate([
    (0, common_1.Get)(),
    (0, require_permission_decorator_1.RequirePermission)('dashboard.read'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AutomationsController.prototype, "estado", null);
__decorate([
    (0, common_1.Get)('envios'),
    (0, require_permission_decorator_1.RequirePermission)('appointment.read'),
    __param(0, (0, common_1.Query)('limite')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AutomationsController.prototype, "envios", null);
exports.AutomationsController = AutomationsController = __decorate([
    (0, common_1.Controller)('automatizaciones'),
    __metadata("design:paramtypes", [automations_service_1.AutomationsService])
], AutomationsController);
//# sourceMappingURL=automations.controller.js.map