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
Object.defineProperty(exports, "__esModule", { value: true });
exports.PatientsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const audit_service_1 = require("../audit/audit.service");
const timeline_service_1 = require("../timeline/timeline.service");
let PatientsService = class PatientsService {
    prisma;
    audit;
    timeline;
    constructor(prisma, audit, timeline) {
        this.prisma = prisma;
        this.audit = audit;
        this.timeline = timeline;
    }
    async ficha(id, ctx) {
        const persona = await this.prisma.person.findFirst({
            where: { id, deletedAt: null },
            select: {
                id: true,
                displayName: true,
                docType: true,
                docNumber: true,
                birthDate: true,
                sex: true,
                phone: true,
                email: true,
                addressLine: true,
                isPatient: true,
                patientSince: true,
                mrn: true,
                tags: true,
                notes: true,
                mergedIntoId: true,
                coverages: {
                    orderBy: { isPrimary: 'desc' },
                    select: {
                        id: true,
                        regime: true,
                        planName: true,
                        isPrimary: true,
                        payer: { select: { name: true, type: true } },
                    },
                },
                appointments: {
                    orderBy: { startsAt: 'desc' },
                    take: 50,
                    select: {
                        id: true,
                        publicCode: true,
                        status: true,
                        startsAt: true,
                        service: { select: { name: true } },
                        site: { select: { code: true } },
                    },
                },
                conversations: {
                    orderBy: { lastMessageAt: 'desc' },
                    take: 10,
                    select: {
                        id: true,
                        phoneNumber: true,
                        lastMessageAt: true,
                        lastMessageText: true,
                        status: true,
                    },
                },
                consents: {
                    orderBy: { grantedAt: 'desc' },
                    select: {
                        purpose: true,
                        granted: true,
                        grantedAt: true,
                        revokedAt: true,
                        policyVersion: true,
                    },
                },
            },
        });
        if (!persona)
            throw new common_1.NotFoundException('Paciente no encontrado');
        await this.audit.readOf(persona.id, {
            userId: ctx.user.id,
            ip: ctx.ip,
            userAgent: ctx.userAgent,
        });
        return { ...persona, recorrido: await this.timeline.recorrido(persona.id) };
    }
};
exports.PatientsService = PatientsService;
exports.PatientsService = PatientsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService,
        timeline_service_1.TimelineService])
], PatientsService);
//# sourceMappingURL=patients.service.js.map