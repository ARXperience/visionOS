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
exports.AutomationsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let AutomationsService = class AutomationsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async estado() {
        const hace24h = new Date(Date.now() - 86_400_000);
        const hace7d = new Date(Date.now() - 7 * 86_400_000);
        const [programados, enviados24h, fallidos7d, noShowAuto, pendientes, conversacionesIA] = await Promise.all([
            this.prisma.appointmentNotification.count({ where: { sentAt: null } }),
            this.prisma.appointmentNotification.count({ where: { sentAt: { gte: hace24h } } }),
            this.prisma.appointmentNotification.count({
                where: { outcome: 'FALLIDO', scheduledFor: { gte: hace7d } },
            }),
            this.prisma.appointmentStatusEvent.count({
                where: { toStatus: 'NO_ASISTIO', occurredAt: { gte: hace7d }, byUserId: null },
            }),
            this.prisma.appointmentNotification.findMany({
                where: { sentAt: null, scheduledFor: { lte: new Date() } },
                select: { scheduledFor: true },
                orderBy: { scheduledFor: 'asc' },
                take: 1,
            }),
            this.prisma.conversation.count({ where: { aiEnabled: true } }),
        ]);
        const atrasoMinutos = pendientes[0]
            ? Math.floor((Date.now() - pendientes[0].scheduledFor.getTime()) / 60_000)
            : 0;
        return {
            reglas: [
                {
                    id: 'recordatorio-24h',
                    nombre: 'Recordatorio a 24 horas',
                    descripcion: 'Programa un WhatsApp el día antes de la cita. La unicidad es de la base: un índice único sobre (cita, tipo) impide que se envíe dos veces aunque el planificador corra en paralelo.',
                    frecuencia: 'Se planifica cada 30 minutos; se envía cada 5',
                    activa: true,
                    comprobacion: `${enviados24h} enviados en las últimas 24 h`,
                },
                {
                    id: 'recordatorio-2h',
                    nombre: 'Recordatorio a 2 horas',
                    descripcion: 'El segundo aviso, el que de verdad baja el no-show. Solo sale a quien ya conversó con la clínica.',
                    frecuencia: 'Cada 5 minutos',
                    activa: true,
                    comprobacion: `${programados} en cola`,
                },
                {
                    id: 'no-show',
                    nombre: 'Marcar inasistencia sola',
                    descripcion: 'Una cita que pasó su hora sin check-in se marca NO_ASISTIO sin que nadie tenga que acordarse. Queda como evento del sistema, distinguible de uno marcado por una persona.',
                    frecuencia: 'Cada 10 minutos',
                    activa: true,
                    comprobacion: `${noShowAuto} marcadas solas en 7 días`,
                },
                {
                    id: 'asistente',
                    nombre: 'Respuesta automática del asistente',
                    descripcion: 'Responde en WhatsApp con cinco herramientas y escala a un humano ante cualquier síntoma. Se apaga por conversación desde el inbox.',
                    frecuencia: 'En cada mensaje entrante',
                    activa: Boolean(process.env.OPENAI_API_KEY),
                    comprobacion: process.env.OPENAI_API_KEY
                        ? `${conversacionesIA} conversaciones con IA activa`
                        : 'Sin clave de proveedor: nunca ha respondido a un paciente',
                },
            ],
            salud: {
                enCola: programados,
                atrasoMinutos,
                fallidosUltimos7Dias: fallidos7d,
            },
        };
    }
    ultimos(limite = 50) {
        return this.prisma.appointmentNotification.findMany({
            orderBy: { scheduledFor: 'desc' },
            take: limite,
            select: {
                id: true,
                kind: true,
                scheduledFor: true,
                sentAt: true,
                outcome: true,
                error: true,
                appointment: {
                    select: {
                        publicCode: true,
                        startsAt: true,
                        person: { select: { displayName: true, phone: true } },
                    },
                },
            },
        });
    }
};
exports.AutomationsService = AutomationsService;
exports.AutomationsService = AutomationsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AutomationsService);
//# sourceMappingURL=automations.service.js.map