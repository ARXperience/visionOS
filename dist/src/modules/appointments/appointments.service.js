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
exports.AppointmentsService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const node_crypto_1 = require("node:crypto");
const prisma_service_1 = require("../../prisma/prisma.service");
const audit_service_1 = require("../audit/audit.service");
const timeline_service_1 = require("../timeline/timeline.service");
const SOLAPAMIENTO = '23P01';
const RUTA = {
    PROGRAMADA: ['CONFIRMADA', 'LLEGO', 'CANCELADA', 'NO_ASISTIO'],
    CONFIRMADA: ['LLEGO', 'CANCELADA', 'NO_ASISTIO'],
    LLEGO: ['EN_ADMISION', 'EN_ESPERA', 'CANCELADA'],
    EN_ADMISION: ['EN_ESPERA', 'EN_ATENCION', 'CANCELADA'],
    EN_ESPERA: ['EN_ATENCION', 'CANCELADA', 'NO_ASISTIO'],
    EN_ATENCION: ['EN_PROCEDIMIENTO', 'PARA_FACTURAR', 'FINALIZADA'],
    EN_PROCEDIMIENTO: ['PARA_FACTURAR', 'FINALIZADA'],
    PARA_FACTURAR: ['FINALIZADA'],
    FINALIZADA: [],
    NO_ASISTIO: [],
    CANCELADA: [],
};
const MARCA = {
    CONFIRMADA: 'confirmedAt',
    LLEGO: 'arrivedAt',
    EN_ATENCION: 'attendedAt',
    FINALIZADA: 'completedAt',
};
let AppointmentsService = class AppointmentsService {
    prisma;
    audit;
    timeline;
    constructor(prisma, audit, timeline) {
        this.prisma = prisma;
        this.audit = audit;
        this.timeline = timeline;
    }
    async crear(datos, ctx) {
        const servicio = await this.prisma.service.findUnique({
            where: { id: datos.serviceId },
            select: {
                durationMin: true,
                bufferMin: true,
                professionals: { where: { professionalId: datos.professionalId }, select: { durationMin: true } },
            },
        });
        if (!servicio)
            throw new common_1.NotFoundException('Servicio no encontrado');
        const duracion = servicio.professionals[0]?.durationMin ?? servicio.durationMin;
        const fin = new Date(datos.startsAt.getTime() + duracion * 60_000);
        const finReserva = new Date(fin.getTime() + servicio.bufferMin * 60_000);
        const reservas = [
            { kind: 'PROFESSIONAL', professionalId: datos.professionalId },
            ...(datos.roomId ? [{ kind: 'ROOM', roomId: datos.roomId }] : []),
            ...(datos.equipmentId ? [{ kind: 'EQUIPMENT', equipmentId: datos.equipmentId }] : []),
        ];
        try {
            const cita = await this.prisma.$transaction(async (tx) => {
                const creada = await tx.appointment.create({
                    data: {
                        publicCode: codigoPublico(),
                        siteId: datos.siteId,
                        personId: datos.personId,
                        serviceId: datos.serviceId,
                        startsAt: datos.startsAt,
                        endsAt: fin,
                        laterality: datos.laterality ?? 'NA',
                        notes: datos.notes,
                        conversationId: datos.conversationId,
                        createdVia: datos.createdVia ?? 'PRESENCIAL',
                        createdById: ctx.user?.id ?? null,
                        bookings: {
                            create: reservas.map((r) => ({
                                ...r,
                                siteId: datos.siteId,
                                startsAt: datos.startsAt,
                                endsAt: finReserva,
                                createdById: ctx.user?.id ?? null,
                            })),
                        },
                        statusEvents: {
                            create: {
                                toStatus: 'PROGRAMADA',
                                byUserId: ctx.user?.id ?? null,
                                bySystem: ctx.user ? null : 'asistente',
                            },
                        },
                    },
                    select: { id: true, publicCode: true, startsAt: true, endsAt: true },
                });
                await tx.person.update({
                    where: { id: datos.personId },
                    data: { isPatient: true, patientSince: new Date() },
                });
                const nombreServicio = await tx.service.findUniqueOrThrow({
                    where: { id: datos.serviceId },
                    select: { name: true },
                });
                await this.timeline.emitir({
                    personId: datos.personId,
                    type: 'CITA_CREADA',
                    title: `Agendó ${nombreServicio.name} — ${formatoFecha(datos.startsAt)}`,
                    siteId: datos.siteId,
                    actorUserId: ctx.user?.id ?? null,
                    refType: 'appointment',
                    refId: creada.id,
                    payload: { publicCode: creada.publicCode },
                }, tx);
                return creada;
            });
            await this.audit.record({
                userId: ctx.user?.id,
                action: 'CREATE',
                entityType: 'appointment',
                entityId: cita.id,
                personId: datos.personId,
                siteId: datos.siteId,
                ipAddress: ctx.ip,
            });
            return cita;
        }
        catch (e) {
            if (e instanceof client_1.Prisma.PrismaClientKnownRequestError || esSolapamiento(e)) {
                if (esSolapamiento(e)) {
                    throw new common_1.ConflictException('Ese cupo acaba de ocuparse. Actualice la disponibilidad y elija otro.');
                }
                if (e instanceof client_1.Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
                    throw new common_1.ConflictException('Ese paciente ya tiene ese servicio agendado a esa hora.');
                }
            }
            throw e;
        }
    }
    async cambiarEstado(id, nuevo, ctx) {
        const cita = await this.prisma.appointment.findUnique({
            where: { id },
            select: { id: true, status: true, personId: true, siteId: true },
        });
        if (!cita)
            throw new common_1.NotFoundException('Cita no encontrada');
        if (!RUTA[cita.status].includes(nuevo)) {
            throw new common_1.ConflictException(`Una cita ${cita.status.toLowerCase()} no puede pasar a ${nuevo.toLowerCase()}.`);
        }
        const libera = nuevo === 'CANCELADA' || nuevo === 'NO_ASISTIO';
        const marca = MARCA[nuevo];
        return this.prisma.$transaction(async (tx) => {
            const actualizada = await tx.appointment.update({
                where: { id },
                data: {
                    status: nuevo,
                    ...(marca ? { [marca]: new Date() } : {}),
                    ...(nuevo === 'CANCELADA'
                        ? {
                            cancelledAt: new Date(),
                            cancelActor: ctx.actor ?? 'CLINICA',
                            cancelReason: ctx.motivo,
                        }
                        : {}),
                },
                select: { id: true, status: true, publicCode: true },
            });
            if (libera) {
                await tx.resourceBooking.updateMany({
                    where: { appointmentId: id },
                    data: { active: false },
                });
            }
            await tx.appointmentStatusEvent.create({
                data: {
                    appointmentId: id,
                    fromStatus: cita.status,
                    toStatus: nuevo,
                    reason: ctx.motivo,
                    byUserId: ctx.user?.id ?? null,
                    bySystem: ctx.user ? null : 'sistema',
                },
            });
            const hito = HITOS[nuevo];
            if (hito) {
                await this.timeline.emitir({
                    personId: cita.personId,
                    type: hito.tipo,
                    title: hito.texto(actualizada.publicCode, ctx.motivo),
                    siteId: cita.siteId,
                    actorUserId: ctx.user?.id ?? null,
                    refType: 'appointment',
                    refId: id,
                }, tx);
            }
            return actualizada;
        });
    }
    agenda(siteId, fecha) {
        const desde = new Date(`${fecha}T00:00:00.000Z`);
        const hasta = new Date(`${fecha}T23:59:59.999Z`);
        return this.prisma.appointment.findMany({
            where: { siteId, startsAt: { gte: desde, lte: hasta } },
            orderBy: { startsAt: 'asc' },
            select: {
                id: true,
                publicCode: true,
                status: true,
                startsAt: true,
                endsAt: true,
                notes: true,
                person: { select: { id: true, displayName: true, phone: true } },
                service: { select: { name: true, businessLine: true, requiresDilation: true } },
                bookings: {
                    where: { active: true, kind: 'PROFESSIONAL' },
                    select: { professional: { select: { displayName: true, color: true } } },
                },
            },
        });
    }
};
exports.AppointmentsService = AppointmentsService;
exports.AppointmentsService = AppointmentsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService,
        timeline_service_1.TimelineService])
], AppointmentsService);
const HITOS = {
    CONFIRMADA: { tipo: 'CITA_CONFIRMADA', texto: (c) => `Confirmó la cita ${c}` },
    LLEGO: { tipo: 'CHECKIN', texto: (c) => `Llegó a la cita ${c}` },
    FINALIZADA: { tipo: 'ATENDIDO', texto: (c) => `Fue atendido — cita ${c}` },
    NO_ASISTIO: { tipo: 'NO_ASISTIO', texto: (c) => `No asistió a la cita ${c}` },
    CANCELADA: {
        tipo: 'CITA_CANCELADA',
        texto: (c, motivo) => `Canceló la cita ${c}${motivo ? `: ${motivo}` : ''}`,
    },
};
const formatoFecha = (d) => d.toLocaleString('es-CO', {
    timeZone: 'America/Bogota',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
});
const esSolapamiento = (e) => e instanceof client_1.Prisma.PrismaClientUnknownRequestError
    ? e.message.includes(SOLAPAMIENTO)
    : typeof e === 'object' && e !== null && 'code' in e && e.code === SOLAPAMIENTO;
function codigoPublico() {
    const alfabeto = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
    const bytes = (0, node_crypto_1.randomBytes)(5);
    return `VC-${[...bytes].map((b) => alfabeto[b % alfabeto.length]).join('')}`;
}
//# sourceMappingURL=appointments.service.js.map