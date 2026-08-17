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
var RemindersService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RemindersService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../../prisma/prisma.service");
const conversations_service_1 = require("../conversations/conversations.service");
let RemindersService = RemindersService_1 = class RemindersService {
    prisma;
    conversaciones;
    logger = new common_1.Logger(RemindersService_1.name);
    HORA_MIN = 7;
    HORA_MAX = 20;
    POR_TANDA = 15;
    constructor(prisma, conversaciones) {
        this.prisma = prisma;
        this.conversaciones = conversaciones;
    }
    async programar() {
        const desde = new Date();
        const hasta = new Date(Date.now() + 3 * 24 * 3600_000);
        const citas = await this.prisma.appointment.findMany({
            where: {
                status: { in: ['PROGRAMADA', 'CONFIRMADA'] },
                startsAt: { gte: desde, lte: hasta },
            },
            select: { id: true, startsAt: true },
        });
        let creados = 0;
        for (const cita of citas) {
            for (const [kind, horas] of [
                ['RECORDATORIO_24H', 24],
                ['RECORDATORIO_2H', 2],
            ]) {
                const cuando = new Date(cita.startsAt.getTime() - horas * 3600_000);
                if (cuando < desde)
                    continue;
                try {
                    await this.prisma.appointmentNotification.create({
                        data: { appointmentId: cita.id, kind, scheduledFor: cuando },
                    });
                    creados += 1;
                }
                catch (e) {
                    if (!(e instanceof client_1.Prisma.PrismaClientKnownRequestError && e.code === 'P2002'))
                        throw e;
                }
            }
        }
        if (creados)
            this.logger.log(`${creados} recordatorios programados`);
        return creados;
    }
    async enviar() {
        const hora = Number(new Date().toLocaleString('en-US', { timeZone: 'America/Bogota', hour: '2-digit', hour12: false }));
        if (hora < this.HORA_MIN || hora >= this.HORA_MAX)
            return 0;
        const pendientes = await this.prisma.appointmentNotification.findMany({
            where: { outcome: 'PENDIENTE', scheduledFor: { lte: new Date() }, attempts: { lt: 3 } },
            take: this.POR_TANDA,
            orderBy: { scheduledFor: 'asc' },
            select: {
                id: true,
                kind: true,
                appointment: {
                    select: {
                        publicCode: true,
                        startsAt: true,
                        status: true,
                        personId: true,
                        service: { select: { name: true, preparationNotes: true, requiresDilation: true } },
                        site: { select: { name: true, address: true } },
                    },
                },
            },
        });
        let enviados = 0;
        for (const n of pendientes) {
            const cita = n.appointment;
            if (['CANCELADA', 'NO_ASISTIO', 'FINALIZADA'].includes(cita.status)) {
                await this.prisma.appointmentNotification.update({
                    where: { id: n.id },
                    data: { outcome: 'SIN_RESPUESTA', error: 'La cita ya no está vigente' },
                });
                continue;
            }
            const conv = await this.prisma.conversation.findFirst({
                where: { personId: cita.personId, deletedAt: null },
                orderBy: { lastMessageAt: 'desc' },
                select: { id: true },
            });
            if (!conv) {
                await this.prisma.appointmentNotification.update({
                    where: { id: n.id },
                    data: { outcome: 'FALLIDO', error: 'El paciente no tiene conversación abierta' },
                });
                continue;
            }
            try {
                await this.conversaciones.enviarSistema(conv.id, texto(n.kind, cita));
                await this.prisma.appointmentNotification.update({
                    where: { id: n.id },
                    data: { outcome: 'ENVIADO', sentAt: new Date(), attempts: { increment: 1 } },
                });
                enviados += 1;
            }
            catch (e) {
                await this.prisma.appointmentNotification.update({
                    where: { id: n.id },
                    data: { attempts: { increment: 1 }, error: e.message.slice(0, 300) },
                });
            }
            await pausa(1500 + Math.floor(Math.random() * 2500));
        }
        if (enviados)
            this.logger.log(`${enviados} recordatorios enviados`);
        return enviados;
    }
    async barrerNoShow() {
        const limite = new Date(Date.now() - 40 * 60_000);
        const vencidas = await this.prisma.appointment.findMany({
            where: { status: { in: ['PROGRAMADA', 'CONFIRMADA'] }, startsAt: { lt: limite } },
            select: { id: true },
            take: 50,
        });
        for (const c of vencidas) {
            await this.prisma.$transaction(async (tx) => {
                await tx.appointment.update({ where: { id: c.id }, data: { status: 'NO_ASISTIO' } });
                await tx.resourceBooking.updateMany({
                    where: { appointmentId: c.id },
                    data: { active: false },
                });
                await tx.appointmentStatusEvent.create({
                    data: { appointmentId: c.id, toStatus: 'NO_ASISTIO', bySystem: 'job:barrido_no_show' },
                });
            });
        }
        if (vencidas.length)
            this.logger.log(`${vencidas.length} citas marcadas como no asistió`);
        return vencidas.length;
    }
};
exports.RemindersService = RemindersService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_30_MINUTES),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], RemindersService.prototype, "programar", null);
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_5_MINUTES),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], RemindersService.prototype, "enviar", null);
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_10_MINUTES),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], RemindersService.prototype, "barrerNoShow", null);
exports.RemindersService = RemindersService = RemindersService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        conversations_service_1.ConversationsService])
], RemindersService);
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
function texto(kind, cita) {
    const cuando = cita.startsAt.toLocaleString('es-CO', {
        timeZone: 'America/Bogota',
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit',
    });
    if (kind === 'RECORDATORIO_2H') {
        return `Le recordamos su cita de ${cita.service.name} hoy a las ${cita.startsAt.toLocaleTimeString('es-CO', { timeZone: 'America/Bogota', hour: '2-digit', minute: '2-digit' })}, en ${cita.site.name}. ¡Le esperamos!`;
    }
    const partes = [
        `Buen día. Le recordamos su cita en Visión Colombia:`,
        ``,
        `${cita.service.name}`,
        `${cuando}`,
        `${cita.site.name} — ${cita.site.address}`,
        ``,
    ];
    if (cita.service.requiresDilation) {
        partes.push('Le dilataremos la pupila, así que venga acompañado y evite conducir de regreso.');
    }
    if (cita.service.preparationNotes)
        partes.push(cita.service.preparationNotes);
    partes.push('', `Responda *1* para confirmar o *2* para cancelar. (${cita.publicCode})`);
    return partes.join('\n');
}
//# sourceMappingURL=reminders.service.js.map