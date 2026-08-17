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
exports.SurgeriesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const audit_service_1 = require("../audit/audit.service");
const timeline_service_1 = require("../timeline/timeline.service");
const lista_oms_1 = require("./lista-oms");
const SELECT = {
    id: true,
    status: true,
    laterality: true,
    anesthesia: true,
    consentSignedAt: true,
    consentFileUrl: true,
    entryAt: true,
    pauseAt: true,
    exitAt: true,
    startedAt: true,
    endedAt: true,
    findings: true,
    complications: true,
    suspendReason: true,
    teamNotes: true,
    person: { select: { id: true, displayName: true, docNumber: true, phone: true } },
    site: { select: { id: true, code: true, name: true } },
    surgeon: { select: { id: true, displayName: true } },
    anesthesiologist: { select: { id: true, displayName: true } },
    appointment: {
        select: { id: true, publicCode: true, startsAt: true, endsAt: true, service: { select: { name: true } } },
    },
    implants: {
        select: { id: true, kind: true, brand: true, model: true, power: true, lot: true, serial: true, invima: true },
    },
};
let SurgeriesService = class SurgeriesService {
    prisma;
    audit;
    timeline;
    constructor(prisma, audit, timeline) {
        this.prisma = prisma;
        this.audit = audit;
        this.timeline = timeline;
    }
    async programar(datos, ctx) {
        if (datos.laterality !== 'OD' && datos.laterality !== 'OI') {
            throw new common_1.BadRequestException('Una cirugía se programa sobre UN ojo: OD u OI. Para ambos, programe dos cirugías.');
        }
        const cita = await this.prisma.appointment.findUnique({
            where: { id: datos.appointmentId },
            select: { id: true, personId: true, siteId: true, status: true, surgery: { select: { id: true } } },
        });
        if (!cita)
            throw new common_1.NotFoundException('La cita no existe');
        if (cita.surgery)
            throw new common_1.ConflictException('Esa cita ya tiene una cirugía programada');
        if (cita.status === 'CANCELADA') {
            throw new common_1.BadRequestException('La cita está cancelada: reagéndela antes de programar la cirugía.');
        }
        const cirugia = await this.prisma.surgery.create({
            data: {
                appointmentId: cita.id,
                personId: cita.personId,
                siteId: cita.siteId,
                laterality: datos.laterality,
                surgeonId: datos.surgeonId,
                anesthesiologistId: datos.anesthesiologistId,
                anesthesia: datos.anesthesia ?? 'TOPICA',
                teamNotes: datos.teamNotes?.trim(),
                createdById: ctx.actor.id,
            },
            select: { id: true, laterality: true, status: true },
        });
        await this.prisma.appointment.update({
            where: { id: cita.id },
            data: { laterality: datos.laterality },
        });
        await this.timeline.emitir({
            personId: cita.personId,
            type: 'CIRUGIA_PROGRAMADA',
            title: `Cirugía programada (${datos.laterality})`,
            siteId: cita.siteId,
            actorUserId: ctx.actor.id,
            refType: 'surgery',
            refId: cirugia.id,
        });
        await this.audit.record({
            userId: ctx.actor.id,
            action: 'CREATE',
            entityType: 'surgery',
            entityId: cirugia.id,
            personId: cita.personId,
            siteId: cita.siteId,
            newValues: { laterality: datos.laterality, surgeonId: datos.surgeonId },
            ipAddress: ctx.ip,
        });
        return cirugia;
    }
    listar(filtro) {
        return this.prisma.surgery.findMany({
            where: {
                ...(filtro.siteId ? { siteId: filtro.siteId } : {}),
                ...(filtro.personId ? { personId: filtro.personId } : {}),
                ...(filtro.status ? { status: filtro.status } : {}),
                ...(filtro.desde || filtro.hasta
                    ? {
                        appointment: {
                            startsAt: { ...(filtro.desde ? { gte: filtro.desde } : {}), ...(filtro.hasta ? { lte: filtro.hasta } : {}) },
                        },
                    }
                    : {}),
            },
            orderBy: { appointment: { startsAt: 'asc' } },
            take: 200,
            select: SELECT,
        });
    }
    async ver(id, ctx) {
        const c = await this.prisma.surgery.findUnique({ where: { id }, select: SELECT });
        if (!c)
            throw new common_1.NotFoundException('Cirugía no encontrada');
        await this.audit.record({
            userId: ctx.actor.id,
            action: 'READ',
            entityType: 'surgery',
            entityId: id,
            personId: c.person.id,
            ipAddress: ctx.ip,
        });
        return c;
    }
    async registrarConsentimiento(id, fileUrl, ctx) {
        const c = await this.prisma.surgery.update({
            where: { id },
            data: { consentSignedAt: new Date(), consentFileUrl: fileUrl },
            select: { id: true, personId: true, consentSignedAt: true },
        });
        await this.audit.record({
            userId: ctx.actor.id,
            action: 'UPDATE',
            entityType: 'surgery',
            entityId: id,
            personId: c.personId,
            newValues: { consentimiento: 'firmado', archivo: Boolean(fileUrl) },
            ipAddress: ctx.ip,
        });
        return c;
    }
    async cerrarFase(id, fase, respuestas, lateralidadConfirmada, ctx) {
        const c = await this.prisma.surgery.findUnique({
            where: { id },
            select: {
                id: true,
                personId: true,
                siteId: true,
                status: true,
                laterality: true,
                consentSignedAt: true,
                entryAt: true,
                pauseAt: true,
                startedAt: true,
            },
        });
        if (!c)
            throw new common_1.NotFoundException('Cirugía no encontrada');
        if (c.status === 'SUSPENDIDA')
            throw new common_1.BadRequestException('La cirugía está suspendida.');
        if (fase === 'ENTRADA' && !c.consentSignedAt) {
            throw new common_1.BadRequestException('No se puede completar la entrada sin el consentimiento informado firmado.');
        }
        if (fase === 'PAUSA' && !c.entryAt) {
            throw new common_1.BadRequestException('Complete primero la verificación de entrada.');
        }
        if (fase === 'SALIDA' && !c.pauseAt) {
            throw new common_1.BadRequestException('No hubo pausa quirúrgica registrada.');
        }
        if (fase === 'PAUSA') {
            if (!lateralidadConfirmada) {
                throw new common_1.BadRequestException('Confirme el ojo a operar para cerrar la pausa quirúrgica.');
            }
            if (lateralidadConfirmada !== c.laterality) {
                await this.audit.record({
                    userId: ctx.actor.id,
                    action: 'UPDATE',
                    entityType: 'surgery',
                    entityId: id,
                    personId: c.personId,
                    siteId: c.siteId,
                    newValues: { alerta: 'DISCREPANCIA_LATERALIDAD', programado: c.laterality, confirmado: lateralidadConfirmada },
                    ipAddress: ctx.ip,
                });
                throw new common_1.ConflictException(`DETENGA EL PROCEDIMIENTO. Está programado ${c.laterality} y se confirmó ${lateralidadConfirmada}. ` +
                    'Verifique la historia y la marcación antes de continuar.');
            }
        }
        const faltan = (0, lista_oms_1.faltantes)(fase, respuestas);
        if (faltan.length) {
            throw new common_1.BadRequestException(`Faltan verificaciones obligatorias: ${faltan.join('; ')}`);
        }
        const campos = fase === 'ENTRADA'
            ? { entryAt: new Date(), entryById: ctx.actor.id, entryData: respuestas }
            : fase === 'PAUSA'
                ? { pauseAt: new Date(), pauseById: ctx.actor.id, pauseData: respuestas }
                : { exitAt: new Date(), exitById: ctx.actor.id, exitData: respuestas };
        const actualizada = await this.prisma.surgery.update({
            where: { id },
            data: {
                ...campos,
                ...(fase === 'ENTRADA' ? { status: 'EN_PREPARACION' } : {}),
                ...(fase === 'PAUSA' ? { status: 'EN_QUIROFANO' } : {}),
            },
            select: { id: true, status: true, entryAt: true, pauseAt: true, exitAt: true },
        });
        await this.audit.record({
            userId: ctx.actor.id,
            action: 'UPDATE',
            entityType: 'surgery',
            entityId: id,
            personId: c.personId,
            siteId: c.siteId,
            newValues: { fase, cerradaPor: ctx.actor.id },
            ipAddress: ctx.ip,
        });
        return actualizada;
    }
    async iniciar(id, ctx) {
        const c = await this.prisma.surgery.findUnique({
            where: { id },
            select: { id: true, personId: true, pauseAt: true, startedAt: true, status: true },
        });
        if (!c)
            throw new common_1.NotFoundException('Cirugía no encontrada');
        if (!c.pauseAt) {
            throw new common_1.BadRequestException('No se puede iniciar sin la pausa quirúrgica: es donde se confirma el ojo.');
        }
        if (c.startedAt)
            throw new common_1.BadRequestException('Ya está iniciada.');
        return this.prisma.surgery.update({
            where: { id },
            data: { startedAt: new Date() },
            select: { id: true, startedAt: true, status: true },
        });
    }
    async finalizar(id, datos, ctx) {
        const c = await this.prisma.surgery.findUnique({
            where: { id },
            select: { id: true, personId: true, siteId: true, startedAt: true, exitAt: true, laterality: true, appointmentId: true },
        });
        if (!c)
            throw new common_1.NotFoundException('Cirugía no encontrada');
        if (!c.startedAt)
            throw new common_1.BadRequestException('La cirugía no fue iniciada.');
        if (!c.exitAt) {
            throw new common_1.BadRequestException('Complete la verificación de salida antes de cerrar: es donde se cuenta el instrumental.');
        }
        const cirugia = await this.prisma.surgery.update({
            where: { id },
            data: {
                status: 'OPERADA',
                endedAt: new Date(),
                findings: datos.findings?.trim(),
                complications: datos.complications?.trim(),
            },
            select: { id: true, status: true, endedAt: true },
        });
        await this.timeline.emitir({
            personId: c.personId,
            type: 'CIRUGIA_REALIZADA',
            title: `Cirugía realizada (${c.laterality})`,
            siteId: c.siteId,
            actorUserId: ctx.actor.id,
            refType: 'surgery',
            refId: id,
        });
        await this.audit.record({
            userId: ctx.actor.id,
            action: 'UPDATE',
            entityType: 'surgery',
            entityId: id,
            personId: c.personId,
            siteId: c.siteId,
            newValues: { estado: 'OPERADA', complicaciones: Boolean(datos.complications) },
            ipAddress: ctx.ip,
        });
        return cirugia;
    }
    async suspender(id, motivo, ctx) {
        const c = await this.prisma.surgery.findUnique({
            where: { id },
            select: { id: true, personId: true, siteId: true, startedAt: true },
        });
        if (!c)
            throw new common_1.NotFoundException('Cirugía no encontrada');
        if (c.startedAt) {
            throw new common_1.BadRequestException('Una cirugía ya iniciada no se suspende: se finaliza registrando lo que ocurrió.');
        }
        const cirugia = await this.prisma.surgery.update({
            where: { id },
            data: { status: 'SUSPENDIDA', suspendReason: motivo.trim() },
            select: { id: true, status: true, suspendReason: true },
        });
        await this.audit.record({
            userId: ctx.actor.id,
            action: 'UPDATE',
            entityType: 'surgery',
            entityId: id,
            personId: c.personId,
            siteId: c.siteId,
            newValues: { estado: 'SUSPENDIDA', motivo },
            ipAddress: ctx.ip,
        });
        return cirugia;
    }
    async registrarImplante(id, datos, ctx) {
        const c = await this.prisma.surgery.findUnique({ where: { id }, select: { personId: true } });
        if (!c)
            throw new common_1.NotFoundException('Cirugía no encontrada');
        const implante = await this.prisma.surgeryImplant.create({
            data: { surgeryId: id, ...datos },
            select: { id: true, kind: true, lot: true, serial: true },
        });
        await this.audit.record({
            userId: ctx.actor.id,
            action: 'CREATE',
            entityType: 'surgery_implant',
            entityId: implante.id,
            personId: c.personId,
            newValues: { ...datos },
            ipAddress: ctx.ip,
        });
        return implante;
    }
    async trazabilidad(busqueda) {
        if (!busqueda.lot && !busqueda.serial && !busqueda.model) {
            throw new common_1.BadRequestException('Indique lote, serie o modelo.');
        }
        return this.prisma.surgeryImplant.findMany({
            where: {
                ...(busqueda.lot ? { lot: busqueda.lot } : {}),
                ...(busqueda.serial ? { serial: busqueda.serial } : {}),
                ...(busqueda.model ? { model: { contains: busqueda.model, mode: 'insensitive' } } : {}),
            },
            take: 500,
            select: {
                id: true,
                kind: true,
                brand: true,
                model: true,
                power: true,
                lot: true,
                serial: true,
                surgery: {
                    select: {
                        id: true,
                        laterality: true,
                        endedAt: true,
                        person: { select: { id: true, displayName: true, phone: true, docNumber: true } },
                    },
                },
            },
        });
    }
    async indicadores(siteId) {
        const donde = siteId ? { siteId } : {};
        const [porEstado, operadas, conComplicacion, sinConsentimiento] = await Promise.all([
            this.prisma.surgery.groupBy({ by: ['status'], where: donde, _count: true }),
            this.prisma.surgery.count({ where: { ...donde, status: 'OPERADA' } }),
            this.prisma.surgery.count({ where: { ...donde, complications: { not: null } } }),
            this.prisma.surgery.count({
                where: { ...donde, status: { in: ['PROGRAMADA', 'EN_PREPARACION'] }, consentSignedAt: null },
            }),
        ]);
        return {
            porEstado: Object.fromEntries(porEstado.map((p) => [p.status, p._count])),
            operadas,
            conComplicacion,
            tasaComplicacion: operadas ? Number(((conComplicacion / operadas) * 100).toFixed(1)) : null,
            pendientesDeConsentimiento: sinConsentimiento,
        };
    }
};
exports.SurgeriesService = SurgeriesService;
exports.SurgeriesService = SurgeriesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService,
        timeline_service_1.TimelineService])
], SurgeriesService);
//# sourceMappingURL=surgeries.service.js.map