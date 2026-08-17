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
exports.PatientsController = void 0;
const common_1 = require("@nestjs/common");
const class_validator_1 = require("class-validator");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const require_permission_decorator_1 = require("../../common/decorators/require-permission.decorator");
const prisma_service_1 = require("../../prisma/prisma.service");
const audit_service_1 = require("../audit/audit.service");
const patients_service_1 = require("./patients.service");
const DOCS = ['CC', 'TI', 'CE', 'PA', 'RC', 'NIT', 'MS', 'AS', 'PE', 'PT', 'CN', 'SC', 'DE'];
class BuscarOCrearDto {
    documento;
    tipoDocumento;
    nombre;
    apellido;
    telefono;
}
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(4),
    (0, class_validator_1.MaxLength)(20),
    __metadata("design:type", String)
], BuscarOCrearDto.prototype, "documento", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(DOCS),
    __metadata("design:type", Object)
], BuscarOCrearDto.prototype, "tipoDocumento", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(80),
    __metadata("design:type", String)
], BuscarOCrearDto.prototype, "nombre", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(80),
    __metadata("design:type", String)
], BuscarOCrearDto.prototype, "apellido", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(20),
    __metadata("design:type", String)
], BuscarOCrearDto.prototype, "telefono", void 0);
let PatientsController = class PatientsController {
    prisma;
    audit;
    pacientes;
    constructor(prisma, audit, pacientes) {
        this.prisma = prisma;
        this.audit = audit;
        this.pacientes = pacientes;
    }
    async buscar(q, user, req) {
        const termino = (q ?? '').trim();
        if (termino.length < 3)
            return [];
        const personas = await this.prisma.person.findMany({
            where: {
                deletedAt: null,
                mergedIntoId: null,
                OR: [
                    { displayName: { contains: termino, mode: 'insensitive' } },
                    { docNumber: { startsWith: termino } },
                    { phone: { contains: termino } },
                ],
            },
            take: 20,
            orderBy: { displayName: 'asc' },
            select: {
                id: true,
                displayName: true,
                docType: true,
                docNumber: true,
                phone: true,
                isPatient: true,
            },
        });
        await this.audit.record({
            userId: user.id,
            action: 'READ',
            entityType: 'person',
            newValues: { busqueda: termino, resultados: personas.length },
            ipAddress: req.ip ?? null,
        });
        return personas;
    }
    async buscarOCrear(dto, user, req) {
        const tipo = dto.tipoDocumento ?? 'CC';
        const existente = await this.prisma.person.findFirst({
            where: { docType: tipo, docNumber: dto.documento, deletedAt: null },
            select: { id: true, displayName: true, isPatient: true },
        });
        if (existente)
            return existente;
        const nombre = dto.nombre?.trim() || 'Paciente';
        const apellido = dto.apellido?.trim() ?? '';
        const creada = await this.prisma.person.create({
            data: {
                docType: tipo,
                docNumber: dto.documento,
                firstName: nombre,
                firstSurname: apellido || null,
                displayName: `${nombre} ${apellido}`.trim(),
                phone: dto.telefono ?? null,
            },
            select: { id: true, displayName: true, isPatient: true },
        });
        await this.audit.record({
            userId: user.id,
            action: 'CREATE',
            entityType: 'person',
            entityId: creada.id,
            personId: creada.id,
            ipAddress: req.ip ?? null,
        });
        return creada;
    }
    ficha(id, user, req) {
        return this.pacientes.ficha(id, {
            user,
            ip: req.ip ?? null,
            userAgent: req.headers['user-agent'] ?? null,
        });
    }
};
exports.PatientsController = PatientsController;
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('patient.read'),
    (0, common_1.Get)('buscar'),
    __param(0, (0, common_1.Query)('q')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], PatientsController.prototype, "buscar", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('patient.write'),
    (0, common_1.Post)('buscar-o-crear'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [BuscarOCrearDto, Object, Object]),
    __metadata("design:returntype", Promise)
], PatientsController.prototype, "buscarOCrear", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('patient.read'),
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], PatientsController.prototype, "ficha", null);
exports.PatientsController = PatientsController = __decorate([
    (0, common_1.Controller)('pacientes'),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService,
        patients_service_1.PatientsService])
], PatientsController);
//# sourceMappingURL=patients.controller.js.map