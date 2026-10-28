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
exports.DocumentsController = void 0;
const common_1 = require("@nestjs/common");
const class_validator_1 = require("class-validator");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const require_permission_decorator_1 = require("../../common/decorators/require-permission.decorator");
const documents_service_1 = require("./documents.service");
const TIPOS = [
    'DOCUMENTO_IDENTIDAD',
    'AUTORIZACION',
    'ORDEN_MEDICA',
    'CONSENTIMIENTO',
    'HISTORIA_EXTERNA',
    'SOPORTE_PAGO',
    'OTRO',
];
class DocumentoDto {
    kind;
    title;
    fileUrl;
    fileName;
    mimeType;
    sizeBytes;
    sha256;
    expiresAt;
}
__decorate([
    (0, class_validator_1.IsIn)(TIPOS),
    __metadata("design:type", String)
], DocumentoDto.prototype, "kind", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(2),
    (0, class_validator_1.MaxLength)(160),
    __metadata("design:type", String)
], DocumentoDto.prototype, "title", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(500),
    __metadata("design:type", String)
], DocumentoDto.prototype, "fileUrl", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(200),
    __metadata("design:type", String)
], DocumentoDto.prototype, "fileName", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], DocumentoDto.prototype, "mimeType", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], DocumentoDto.prototype, "sizeBytes", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^[a-f0-9]{64}$/i),
    __metadata("design:type", String)
], DocumentoDto.prototype, "sha256", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], DocumentoDto.prototype, "expiresAt", void 0);
class ArchivarDto {
    motivo;
}
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(5),
    (0, class_validator_1.MaxLength)(300),
    __metadata("design:type", String)
], ArchivarDto.prototype, "motivo", void 0);
let DocumentsController = class DocumentsController {
    documentos;
    constructor(documentos) {
        this.documentos = documentos;
    }
    ctx(user, req) {
        return { actor: user, ip: req.ip };
    }
    dePaciente(personId, user, req) {
        return this.documentos.dePaciente(personId, this.ctx(user, req));
    }
    registrar(personId, dto, user, req) {
        return this.documentos.registrar({ ...dto, personId, expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined }, this.ctx(user, req));
    }
    abrir(id, user, req) {
        return this.documentos.abrir(id, this.ctx(user, req));
    }
    archivar(id, dto, user, req) {
        return this.documentos.archivar(id, dto.motivo, this.ctx(user, req));
    }
};
exports.DocumentsController = DocumentsController;
__decorate([
    (0, common_1.Get)('paciente/:personId'),
    (0, require_permission_decorator_1.RequirePermission)('patient.read'),
    __param(0, (0, common_1.Param)('personId', common_1.ParseUUIDPipe)),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], DocumentsController.prototype, "dePaciente", null);
__decorate([
    (0, common_1.Post)('paciente/:personId'),
    (0, require_permission_decorator_1.RequirePermission)('patient.write'),
    __param(0, (0, common_1.Param)('personId', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, DocumentoDto, Object, Object]),
    __metadata("design:returntype", void 0)
], DocumentsController.prototype, "registrar", null);
__decorate([
    (0, common_1.Get)(':id/abrir'),
    (0, require_permission_decorator_1.RequirePermission)('patient.read'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], DocumentsController.prototype, "abrir", null);
__decorate([
    (0, common_1.Post)(':id/archivar'),
    (0, require_permission_decorator_1.RequirePermission)('patient.write'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, ArchivarDto, Object, Object]),
    __metadata("design:returntype", void 0)
], DocumentsController.prototype, "archivar", null);
exports.DocumentsController = DocumentsController = __decorate([
    (0, common_1.Controller)('documentos'),
    __metadata("design:paramtypes", [documents_service_1.DocumentsService])
], DocumentsController);
//# sourceMappingURL=documents.controller.js.map