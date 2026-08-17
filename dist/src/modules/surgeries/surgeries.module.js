"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SurgeriesModule = void 0;
const common_1 = require("@nestjs/common");
const timeline_module_1 = require("../timeline/timeline.module");
const surgeries_controller_1 = require("./surgeries.controller");
const surgeries_service_1 = require("./surgeries.service");
let SurgeriesModule = class SurgeriesModule {
};
exports.SurgeriesModule = SurgeriesModule;
exports.SurgeriesModule = SurgeriesModule = __decorate([
    (0, common_1.Module)({
        imports: [timeline_module_1.TimelineModule],
        controllers: [surgeries_controller_1.SurgeriesController],
        providers: [surgeries_service_1.SurgeriesService],
    })
], SurgeriesModule);
//# sourceMappingURL=surgeries.module.js.map