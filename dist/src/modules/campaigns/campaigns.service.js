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
exports.CampaignsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const audit_service_1 = require("../audit/audit.service");
let CampaignsService = class CampaignsService {
    prisma;
    audit;
    constructor(prisma, audit) {
        this.prisma = prisma;
        this.audit = audit;
    }
    async crearEmpresa(datos) {
        const nit = datos.nit.replace(/[^0-9]/g, '');
        if (nit.length < 5)
            throw new common_1.BadRequestException('El NIT no parece válido.');
        const existente = await this.prisma.company.findUnique({
            where: { nit },
            select: { id: true, name: true, isActive: true },
        });
        if (existente) {
            throw new common_1.ConflictException(`Ese NIT ya está registrado como "${existente.name}"${existente.isActive ? '' : ' (inactiva)'}.`);
        }
        return this.prisma.company.create({
            data: { ...datos, nit, name: datos.name.trim() },
            select: { id: true, nit: true, name: true },
        });
    }
    empresas() {
        return this.prisma.company.findMany({
            where: { isActive: true },
            orderBy: { name: 'asc' },
            select: {
                id: true,
                nit: true,
                name: true,
                contactName: true,
                contactPhone: true,
                _count: { select: { campaigns: true } },
            },
        });
    }
    async crear(datos, ctx) {
        const c = await this.prisma.campaign.create({
            data: { ...datos, name: datos.name.trim(), createdById: ctx.actor.id },
            select: { id: true, name: true, status: true, scheduledAt: true },
        });
        await this.audit.record({
            userId: ctx.actor.id,
            action: 'CREATE',
            entityType: 'campaign',
            entityId: c.id,
            siteId: datos.siteId,
            newValues: { nombre: c.name, empresa: datos.companyId },
            ipAddress: ctx.ip,
        });
        return c;
    }
    async listar(status) {
        const campanas = await this.prisma.campaign.findMany({
            where: status ? { status: status } : {},
            orderBy: { scheduledAt: 'desc' },
            take: 100,
            select: {
                id: true,
                name: true,
                status: true,
                scheduledAt: true,
                location: true,
                expectedPeople: true,
                notes: true,
                company: { select: { id: true, name: true, contactName: true, contactPhone: true } },
                site: { select: { code: true } },
                participants: {
                    select: {
                        id: true,
                        finding: true,
                        needsFollowUp: true,
                        person: {
                            select: {
                                id: true,
                                displayName: true,
                                phone: true,
                                appointments: { select: { id: true, startsAt: true }, take: 1, orderBy: { startsAt: 'desc' } },
                            },
                        },
                    },
                },
            },
        });
        return campanas.map((c) => {
            const atendidos = c.participants.length;
            const conHallazgo = c.participants.filter((p) => p.needsFollowUp);
            const agendados = conHallazgo.filter((p) => p.person.appointments.length > 0).length;
            return {
                ...c,
                atendidos,
                asistencia: c.expectedPeople ? Number(((atendidos / c.expectedPeople) * 100).toFixed(1)) : null,
                requierenValoracion: conHallazgo.length,
                yaAgendados: agendados,
                sinAgendar: conHallazgo.length - agendados,
            };
        });
    }
    async registrar(campaignId, datos, ctx) {
        const campana = await this.prisma.campaign.findUnique({
            where: { id: campaignId },
            select: { id: true, status: true, siteId: true, name: true },
        });
        if (!campana)
            throw new common_1.NotFoundException('Jornada no encontrada');
        if (campana.status === 'CANCELADA')
            throw new common_1.BadRequestException('La jornada está cancelada.');
        const documento = datos.documento.trim();
        const apellido = datos.apellido?.trim() || 'Sin apellido';
        const persona = await this.prisma.person.upsert({
            where: { docType_docNumber: { docType: 'CC', docNumber: documento } },
            create: {
                docType: 'CC',
                docNumber: documento,
                firstName: datos.nombre.trim(),
                firstSurname: apellido,
                displayName: `${datos.nombre.trim()} ${apellido}`.trim(),
                phone: datos.telefono?.trim(),
                isPatient: Boolean(datos.needsFollowUp),
            },
            update: {
                ...(datos.telefono ? { phone: datos.telefono.trim() } : {}),
                ...(datos.needsFollowUp ? { isPatient: true } : {}),
            },
            select: { id: true, displayName: true },
        });
        const yaEsta = await this.prisma.campaignParticipant.findUnique({
            where: { campaignId_personId: { campaignId, personId: persona.id } },
            select: { id: true },
        });
        if (yaEsta)
            throw new common_1.ConflictException(`${persona.displayName} ya fue registrado en esta jornada.`);
        const p = await this.prisma.campaignParticipant.create({
            data: {
                campaignId,
                personId: persona.id,
                finding: datos.finding?.trim(),
                needsFollowUp: datos.needsFollowUp ?? false,
            },
            select: { id: true, needsFollowUp: true },
        });
        await this.audit.record({
            userId: ctx.actor.id,
            action: 'CREATE',
            entityType: 'campaign_participant',
            entityId: p.id,
            personId: persona.id,
            siteId: campana.siteId,
            newValues: { jornada: campana.name, requiereValoracion: p.needsFollowUp },
            ipAddress: ctx.ip,
        });
        return { ...p, persona };
    }
    async cambiarEstado(id, status, ctx) {
        const c = await this.prisma.campaign.update({
            where: { id },
            data: { status },
            select: { id: true, status: true, siteId: true },
        });
        await this.audit.record({
            userId: ctx.actor.id,
            action: 'UPDATE',
            entityType: 'campaign',
            entityId: id,
            siteId: c.siteId,
            newValues: { estado: status },
            ipAddress: ctx.ip,
        });
        return c;
    }
    async pendientesDeLlamar() {
        const conHallazgo = await this.prisma.campaignParticipant.findMany({
            where: { needsFollowUp: true },
            select: {
                id: true,
                finding: true,
                createdAt: true,
                campaign: { select: { name: true, scheduledAt: true, company: { select: { name: true } } } },
                person: {
                    select: {
                        id: true,
                        displayName: true,
                        phone: true,
                        appointments: { select: { id: true }, take: 1 },
                    },
                },
            },
        });
        const ahora = Date.now();
        return conHallazgo
            .filter((p) => p.person.appointments.length === 0)
            .map((p) => ({
            personId: p.person.id,
            paciente: p.person.displayName,
            telefono: p.person.phone,
            hallazgo: p.finding,
            empresa: p.campaign.company.name,
            jornada: p.campaign.name,
            diasDesde: Math.floor((ahora - p.createdAt.getTime()) / 86_400_000),
        }))
            .sort((a, b) => b.diasDesde - a.diasDesde);
    }
};
exports.CampaignsService = CampaignsService;
exports.CampaignsService = CampaignsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService])
], CampaignsService);
//# sourceMappingURL=campaigns.service.js.map