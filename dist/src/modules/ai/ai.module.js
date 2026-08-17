"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiModule = void 0;
const common_1 = require("@nestjs/common");
const appointments_module_1 = require("../appointments/appointments.module");
const conversations_module_1 = require("../conversations/conversations.module");
const ai_controller_1 = require("./ai.controller");
const asistente_service_1 = require("./asistente.service");
let AiModule = class AiModule {
};
exports.AiModule = AiModule;
exports.AiModule = AiModule = __decorate([
    (0, common_1.Module)({
        imports: [conversations_module_1.ConversationsModule, appointments_module_1.AppointmentsModule],
        controllers: [ai_controller_1.AiController],
        providers: [asistente_service_1.AsistenteService],
        exports: [asistente_service_1.AsistenteService],
    })
], AiModule);
//# sourceMappingURL=ai.module.js.map