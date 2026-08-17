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
exports.UsersController = void 0;
const common_1 = require("@nestjs/common");
const class_validator_1 = require("class-validator");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const require_permission_decorator_1 = require("../../common/decorators/require-permission.decorator");
const permissions_1 = require("../../common/permissions");
const users_service_1 = require("./users.service");
const ROLES = [
    'SUPERADMIN', 'ADMIN_SEDE', 'COORDINACION', 'RECEPCION', 'AGENDAMIENTO',
    'CALL_CENTER', 'PROFESIONAL', 'FACTURACION', 'AUDITOR',
];
const CLAVE_MINIMA = 12;
class CrearUsuarioDto {
    email;
    password;
    firstName;
    lastName;
    phone;
    role;
    siteIds;
    crossSitePatientRead;
}
__decorate([
    (0, class_validator_1.IsEmail)({}, { message: 'Correo inválido' }),
    __metadata("design:type", String)
], CrearUsuarioDto.prototype, "email", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(CLAVE_MINIMA, { message: `Mínimo ${CLAVE_MINIMA} caracteres` }),
    (0, class_validator_1.MaxLength)(200),
    __metadata("design:type", String)
], CrearUsuarioDto.prototype, "password", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(2),
    (0, class_validator_1.MaxLength)(60),
    __metadata("design:type", String)
], CrearUsuarioDto.prototype, "firstName", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(2),
    (0, class_validator_1.MaxLength)(60),
    __metadata("design:type", String)
], CrearUsuarioDto.prototype, "lastName", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(20),
    __metadata("design:type", String)
], CrearUsuarioDto.prototype, "phone", void 0);
__decorate([
    (0, class_validator_1.IsIn)(ROLES),
    __metadata("design:type", String)
], CrearUsuarioDto.prototype, "role", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ArrayNotEmpty)({ message: 'Asigne al menos una sede' }),
    (0, class_validator_1.IsUUID)('4', { each: true }),
    __metadata("design:type", Array)
], CrearUsuarioDto.prototype, "siteIds", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CrearUsuarioDto.prototype, "crossSitePatientRead", void 0);
class ActualizarUsuarioDto {
    firstName;
    lastName;
    phone;
    role;
    crossSitePatientRead;
    siteIds;
}
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(2),
    (0, class_validator_1.MaxLength)(60),
    __metadata("design:type", String)
], ActualizarUsuarioDto.prototype, "firstName", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(2),
    (0, class_validator_1.MaxLength)(60),
    __metadata("design:type", String)
], ActualizarUsuarioDto.prototype, "lastName", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(20),
    __metadata("design:type", String)
], ActualizarUsuarioDto.prototype, "phone", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(ROLES),
    __metadata("design:type", String)
], ActualizarUsuarioDto.prototype, "role", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], ActualizarUsuarioDto.prototype, "crossSitePatientRead", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsUUID)('4', { each: true }),
    __metadata("design:type", Array)
], ActualizarUsuarioDto.prototype, "siteIds", void 0);
class ClaveDto {
    password;
}
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(CLAVE_MINIMA, { message: `Mínimo ${CLAVE_MINIMA} caracteres` }),
    (0, class_validator_1.MaxLength)(200),
    __metadata("design:type", String)
], ClaveDto.prototype, "password", void 0);
class EstadoDto {
    activo;
}
__decorate([
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], EstadoDto.prototype, "activo", void 0);
let UsersController = class UsersController {
    usuarios;
    constructor(usuarios) {
        this.usuarios = usuarios;
    }
    ctx(user, req) {
        return { actor: user, ip: req.ip ?? null };
    }
    roles() {
        return ROLES.map((r) => ({
            role: r,
            permisos: permissions_1.ROLE_PERMISSIONS[r].length,
            detalle: [...permissions_1.ROLE_PERMISSIONS[r]],
        }));
    }
    listar() {
        return this.usuarios.listar();
    }
    crear(dto, user, req) {
        return this.usuarios.crear(dto, this.ctx(user, req));
    }
    actualizar(id, dto, user, req) {
        return this.usuarios.actualizar(id, dto, this.ctx(user, req));
    }
    clave(id, dto, user, req) {
        return this.usuarios.cambiarClave(id, dto.password, this.ctx(user, req));
    }
    estado(id, dto, user, req) {
        return this.usuarios.cambiarEstado(id, dto.activo, this.ctx(user, req));
    }
    baja(id, user, req) {
        return this.usuarios.darDeBaja(id, this.ctx(user, req));
    }
};
exports.UsersController = UsersController;
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('user.read'),
    (0, common_1.Get)('roles'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "roles", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('user.read'),
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "listar", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('user.manage'),
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [CrearUsuarioDto, Object, Object]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "crear", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('user.manage'),
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, ActualizarUsuarioDto, Object, Object]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "actualizar", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('user.manage'),
    (0, common_1.Post)(':id/clave'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, ClaveDto, Object, Object]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "clave", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('user.manage'),
    (0, common_1.Post)(':id/estado'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, EstadoDto, Object, Object]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "estado", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('user.manage'),
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "baja", null);
exports.UsersController = UsersController = __decorate([
    (0, common_1.Controller)('usuarios'),
    __metadata("design:paramtypes", [users_service_1.UsersService])
], UsersController);
//# sourceMappingURL=users.controller.js.map