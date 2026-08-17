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
exports.ProfessionalsService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../../prisma/prisma.service");
const audit_service_1 = require("../audit/audit.service");
let ProfessionalsService = class ProfessionalsService {
    prisma;
    audit;
    constructor(prisma, audit) {
        this.prisma = prisma;
        this.audit = audit;
    }
    listar() {
        return this.prisma.professional.findMany({
            orderBy: [{ isActive: 'desc' }, { displayName: 'asc' }],
            select: {
                id: true,
                displayName: true,
                docType: true,
                docNumber: true,
                type: true,
                licenseNumber: true,
                specialties: true,
                color: true,
                isActive: true,
                sites: { select: { site: { select: { id: true, code: true, name: true } } } },
                services: { select: { serviceId: true, durationMin: true } },
                availabilities: {
                    orderBy: [{ weekday: 'asc' }, { startMinute: 'asc' }],
                    select: {
                        id: true,
                        weekday: true,
                        startMinute: true,
                        endMinute: true,
                        site: { select: { id: true, code: true } },
                    },
                },
            },
        });
    }
    async crear(datos, ctx) {
        if (!datos.siteIds.length) {
            throw new common_1.BadRequestException('Asigne al menos una sede donde atienda.');
        }
        const tratamiento = datos.type === 'OPTOMETRA' ? 'Opt.' : datos.type === 'ENFERMERIA' ? 'Enf.' : 'Dr(a).';
        try {
            const p = await this.prisma.professional.create({
                data: {
                    docNumber: datos.docNumber.trim(),
                    firstName: datos.firstName.trim(),
                    lastName: datos.lastName.trim(),
                    displayName: `${tratamiento} ${datos.firstName.trim()} ${datos.lastName.trim()}`,
                    type: datos.type,
                    licenseNumber: datos.licenseNumber?.trim() || null,
                    specialties: datos.specialties ?? [],
                    color: datos.color ?? null,
                    sites: { create: datos.siteIds.map((siteId) => ({ siteId })) },
                },
                select: { id: true, displayName: true },
            });
            await this.audit.record({
                userId: ctx.actor.id,
                action: 'CREATE',
                entityType: 'professional',
                entityId: p.id,
                newValues: { nombre: p.displayName, tipo: datos.type },
                ipAddress: ctx.ip,
            });
            return p;
        }
        catch (e) {
            if (e instanceof client_1.Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
                throw new common_1.ConflictException('Ya existe un profesional con ese documento.');
            }
            throw e;
        }
    }
    async asignarServicios(id, serviceIds, ctx) {
        await this.prisma.professional.findUniqueOrThrow({ where: { id }, select: { id: true } });
        await this.prisma.$transaction(async (tx) => {
            const previos = await tx.serviceProfessional.findMany({
                where: { professionalId: id },
                select: { serviceId: true, durationMin: true },
            });
            const duracion = new Map(previos.map((p) => [p.serviceId, p.durationMin]));
            await tx.serviceProfessional.deleteMany({ where: { professionalId: id } });
            if (serviceIds.length) {
                await tx.serviceProfessional.createMany({
                    data: serviceIds.map((serviceId) => ({
                        serviceId,
                        professionalId: id,
                        durationMin: duracion.get(serviceId) ?? null,
                    })),
                });
            }
        });
        await this.audit.record({
            userId: ctx.actor.id,
            action: 'UPDATE',
            entityType: 'professional',
            entityId: id,
            newValues: { servicios: serviceIds.length },
            ipAddress: ctx.ip,
        });
        return { id, servicios: serviceIds.length };
    }
    async agregarFranja(datos, ctx) {
        const startMinute = aMinutos(datos.inicio);
        const endMinute = aMinutos(datos.fin);
        if (endMinute <= startMinute) {
            throw new common_1.BadRequestException('La hora de fin debe ser posterior a la de inicio.');
        }
        const solapa = await this.prisma.professionalAvailability.findFirst({
            where: {
                professionalId: datos.professionalId,
                siteId: datos.siteId,
                weekday: datos.weekday,
                startMinute: { lt: endMinute },
                endMinute: { gt: startMinute },
            },
            select: { startMinute: true, endMinute: true },
        });
        if (solapa) {
            throw new common_1.ConflictException(`Se cruza con la franja de ${aHora(solapa.startMinute)} a ${aHora(solapa.endMinute)}.`);
        }
        const f = await this.prisma.professionalAvailability.create({
            data: {
                professionalId: datos.professionalId,
                siteId: datos.siteId,
                weekday: datos.weekday,
                startMinute,
                endMinute,
            },
            select: { id: true, weekday: true, startMinute: true, endMinute: true },
        });
        await this.audit.record({
            userId: ctx.actor.id,
            action: 'CREATE',
            entityType: 'professional_availability',
            entityId: f.id,
            newValues: { dia: datos.weekday, de: datos.inicio, a: datos.fin },
            ipAddress: ctx.ip,
        });
        return f;
    }
    async quitarFranja(id, ctx) {
        const f = await this.prisma.professionalAvailability.findUnique({
            where: { id },
            select: { professionalId: true, siteId: true, weekday: true, startMinute: true, endMinute: true },
        });
        if (!f)
            throw new common_1.NotFoundException('Franja no encontrada');
        const futuras = await this.prisma.resourceBooking.count({
            where: {
                professionalId: f.professionalId,
                siteId: f.siteId,
                active: true,
                startsAt: { gte: new Date() },
                appointment: { status: { in: ['PROGRAMADA', 'CONFIRMADA'] } },
            },
        });
        await this.prisma.professionalAvailability.delete({ where: { id } });
        await this.audit.record({
            userId: ctx.actor.id,
            action: 'DELETE',
            entityType: 'professional_availability',
            entityId: id,
            oldValues: { dia: f.weekday, de: aHora(f.startMinute), a: aHora(f.endMinute) },
            ipAddress: ctx.ip,
        });
        return {
            id,
            citasFuturasDelProfesional: futuras,
            aviso: futuras > 0
                ? `Este profesional tiene ${futuras} cita(s) futura(s). Quitar la franja no las cancela: revíselas.`
                : null,
        };
    }
    async bloquear(datos, ctx) {
        try {
            const b = await this.prisma.resourceBooking.create({
                data: {
                    kind: 'PROFESSIONAL',
                    professionalId: datos.professionalId,
                    siteId: datos.siteId,
                    startsAt: new Date(datos.desde),
                    endsAt: new Date(datos.hasta),
                    blockReason: datos.motivo,
                    createdById: ctx.actor.id,
                },
                select: { id: true, startsAt: true, endsAt: true },
            });
            await this.audit.record({
                userId: ctx.actor.id,
                action: 'CREATE',
                entityType: 'resource_booking',
                entityId: b.id,
                newValues: { motivo: datos.motivo, desde: datos.desde, hasta: datos.hasta },
                ipAddress: ctx.ip,
            });
            return b;
        }
        catch (e) {
            if (String(e).includes('23P01')) {
                throw new common_1.ConflictException('Ya hay una cita en ese rango. Reagéndela antes de bloquear la agenda.');
            }
            throw e;
        }
    }
    bloqueos(professionalId) {
        return this.prisma.resourceBooking.findMany({
            where: { professionalId, appointmentId: null, active: true, endsAt: { gte: new Date() } },
            orderBy: { startsAt: 'asc' },
            select: { id: true, startsAt: true, endsAt: true, blockReason: true, site: { select: { code: true } } },
        });
    }
    quitarBloqueo(id) {
        return this.prisma.resourceBooking.update({
            where: { id },
            data: { active: false },
            select: { id: true },
        });
    }
    async cambiarEstado(id, activo, ctx) {
        const futuras = await this.prisma.resourceBooking.count({
            where: {
                professionalId: id,
                active: true,
                startsAt: { gte: new Date() },
                appointment: { status: { in: ['PROGRAMADA', 'CONFIRMADA'] } },
            },
        });
        const p = await this.prisma.professional.update({
            where: { id },
            data: { isActive: activo },
            select: { id: true, displayName: true, isActive: true },
        });
        await this.audit.record({
            userId: ctx.actor.id,
            action: 'UPDATE',
            entityType: 'professional',
            entityId: id,
            newValues: { activo },
            ipAddress: ctx.ip,
        });
        return {
            ...p,
            aviso: !activo && futuras > 0
                ? `Tiene ${futuras} cita(s) futura(s). Desactivarlo no las cancela: revíselas.`
                : null,
        };
    }
};
exports.ProfessionalsService = ProfessionalsService;
exports.ProfessionalsService = ProfessionalsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService])
], ProfessionalsService);
const aMinutos = (hhmm) => {
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + m;
};
const aHora = (min) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
//# sourceMappingURL=professionals.service.js.map