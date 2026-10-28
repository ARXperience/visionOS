"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PublicoModule = void 0;
const common_1 = require("@nestjs/common");
const pqrsf_module_1 = require("../pqrsf/pqrsf.module");
const publico_controller_1 = require("./publico.controller");
const publico_service_1 = require("./publico.service");
let PublicoModule = class PublicoModule {
};
exports.PublicoModule = PublicoModule;
exports.PublicoModule = PublicoModule = __decorate([
    (0, common_1.Module)({
        imports: [pqrsf_module_1.PqrsfModule],
        controllers: [publico_controller_1.PublicoController],
        providers: [publico_service_1.PublicoService],
    })
], PublicoModule);
//# sourceMappingURL=publico.module.js.map