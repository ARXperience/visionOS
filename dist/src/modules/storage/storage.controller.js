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
exports.StorageController = void 0;
const common_1 = require("@nestjs/common");
const class_validator_1 = require("class-validator");
const require_permission_decorator_1 = require("../../common/decorators/require-permission.decorator");
const storage_service_1 = require("./storage.service");
class FirmarSubidaDto {
    nombre;
    tipo;
    bytes;
    destino;
}
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", String)
], FirmarSubidaDto.prototype, "nombre", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(120),
    __metadata("design:type", String)
], FirmarSubidaDto.prototype, "tipo", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], FirmarSubidaDto.prototype, "bytes", void 0);
__decorate([
    (0, class_validator_1.IsIn)(['resultados', 'documentos', 'consentimientos']),
    __metadata("design:type", String)
], FirmarSubidaDto.prototype, "destino", void 0);
let StorageController = class StorageController {
    storage;
    constructor(storage) {
        this.storage = storage;
    }
    estado() {
        return { habilitado: this.storage.habilitado };
    }
    firmarSubida(dto) {
        return this.storage.firmarSubida({
            nombre: dto.nombre,
            tipo: dto.tipo,
            bytes: dto.bytes,
            carpeta: dto.destino,
        });
    }
};
exports.StorageController = StorageController;
__decorate([
    (0, common_1.Get)('estado'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], StorageController.prototype, "estado", null);
__decorate([
    (0, common_1.Post)('firmar-subida'),
    (0, require_permission_decorator_1.RequirePermission)('patient.write'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [FirmarSubidaDto]),
    __metadata("design:returntype", void 0)
], StorageController.prototype, "firmarSubida", null);
exports.StorageController = StorageController = __decorate([
    (0, common_1.Controller)('archivos'),
    __metadata("design:paramtypes", [storage_service_1.StorageService])
], StorageController);
//# sourceMappingURL=storage.controller.js.map