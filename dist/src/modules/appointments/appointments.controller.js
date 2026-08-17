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
exports.AppointmentsController = void 0;
const common_1 = require("@nestjs/common");
const class_validator_1 = require("class-validator");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const require_permission_decorator_1 = require("../../common/decorators/require-permission.decorator");
const appointments_service_1 = require("./appointments.service");
const availability_service_1 = require("./availability.service");
const ESTADOS = [
    'PROGRAMADA', 'CONFIRMADA', 'LLEGO', 'EN_ADMISION', 'EN_ESPERA', 'EN_ATENCION',
    'EN_PROCEDIMIENTO', 'PARA_FACTURAR', 'FINALIZADA', 'NO_ASISTIO', 'CANCELADA',
];
class CrearCitaDto {
    siteId;
    personId;
    serviceId;
    professionalId;
    roomId;
    equipmentId;
    startsAt;
    laterality;
    notes;
}
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CrearCitaDto.prototype, "siteId", void 0);
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CrearCitaDto.prototype, "personId", void 0);
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CrearCitaDto.prototype, "serviceId", void 0);
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CrearCitaDto.prototype, "professionalId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CrearCitaDto.prototype, "roomId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CrearCitaDto.prototype, "equipmentId", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CrearCitaDto.prototype, "startsAt", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(['OD', 'OI', 'AO', 'NA']),
    __metadata("design:type", String)
], CrearCitaDto.prototype, "laterality", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(1000),
    __metadata("design:type", String)
], CrearCitaDto.prototype, "notes", void 0);
class EstadoDto {
    estado;
    motivo;
    actor;
}
__decorate([
    (0, class_validator_1.IsIn)(ESTADOS),
    __metadata("design:type", String)
], EstadoDto.prototype, "estado", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(300),
    __metadata("design:type", String)
], EstadoDto.prototype, "motivo", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(['PACIENTE', 'CLINICA', 'PROFESIONAL', 'ASEGURADOR', 'SISTEMA']),
    __metadata("design:type", String)
], EstadoDto.prototype, "actor", void 0);
let AppointmentsController = class AppointmentsController {
    citas;
    disponibilidad;
    constructor(citas, disponibilidad) {
        this.citas = citas;
        this.disponibilidad = disponibilidad;
    }
    huecos(siteId, serviceId, fecha, professionalId) {
        return this.disponibilidad.huecos({ siteId, serviceId, fecha, professionalId });
    }
    agenda(siteId, fecha) {
        return this.citas.agenda(siteId, fecha);
    }
    crear(dto, user, req) {
        return this.citas.crear({ ...dto, startsAt: new Date(dto.startsAt), createdVia: 'PRESENCIAL' }, { user, ip: req.ip ?? null });
    }
    estado(id, dto, user) {
        return this.citas.cambiarEstado(id, dto.estado, {
            user,
            motivo: dto.motivo,
            actor: dto.actor,
        });
    }
};
exports.AppointmentsController = AppointmentsController;
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('appointment.read'),
    (0, common_1.Get)('disponibilidad'),
    __param(0, (0, common_1.Query)('siteId', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Query)('serviceId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Query)('fecha')),
    __param(3, (0, common_1.Query)('professionalId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", void 0)
], AppointmentsController.prototype, "huecos", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('appointment.read'),
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('siteId', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Query)('fecha')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], AppointmentsController.prototype, "agenda", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('appointment.write'),
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [CrearCitaDto, Object, Object]),
    __metadata("design:returntype", void 0)
], AppointmentsController.prototype, "crear", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('appointment.write'),
    (0, common_1.Post)(':id/estado'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, EstadoDto, Object]),
    __metadata("design:returntype", void 0)
], AppointmentsController.prototype, "estado", null);
exports.AppointmentsController = AppointmentsController = __decorate([
    (0, common_1.Controller)('agenda'),
    __metadata("design:paramtypes", [appointments_service_1.AppointmentsService,
        availability_service_1.AvailabilityService])
], AppointmentsController);
//# sourceMappingURL=appointments.controller.js.map