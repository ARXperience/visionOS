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
exports.AvailabilityService = void 0;
exports.enZona = enZona;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const PASO_MIN = 15;
let AvailabilityService = class AvailabilityService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async huecos(params) {
        const servicio = await this.prisma.service.findUnique({
            where: { id: params.serviceId },
            select: {
                durationMin: true,
                bufferMin: true,
                requiresRoom: true,
                requiredRoomKind: true,
                requiredModality: true,
                professionals: { select: { professionalId: true, durationMin: true } },
            },
        });
        if (!servicio)
            throw new common_1.NotFoundException('Servicio no encontrado');
        const sede = await this.prisma.site.findUnique({
            where: { id: params.siteId },
            select: { timezone: true },
        });
        if (!sede)
            throw new common_1.NotFoundException('Sede no encontrada');
        const esFestivo = await this.prisma.holiday.findUnique({
            where: { date: new Date(`${params.fecha}T00:00:00.000Z`) },
            select: { date: true },
        });
        if (esFestivo)
            return [];
        const diaSemana = new Date(`${params.fecha}T12:00:00.000Z`).getUTCDay();
        const franjas = await this.prisma.professionalAvailability.findMany({
            where: {
                siteId: params.siteId,
                weekday: diaSemana,
                ...(params.professionalId ? { professionalId: params.professionalId } : {}),
                professional: { isActive: true },
                OR: [{ validFrom: null }, { validFrom: { lte: new Date(params.fecha) } }],
                AND: [{ OR: [{ validTo: null }, { validTo: { gte: new Date(params.fecha) } }] }],
            },
            select: {
                professionalId: true,
                startMinute: true,
                endMinute: true,
                serviceIds: true,
                professional: { select: { displayName: true } },
            },
        });
        if (!franjas.length)
            return [];
        const habilitados = new Map(servicio.professionals.map((p) => [p.professionalId, p.durationMin]));
        const salas = servicio.requiresRoom
            ? await this.prisma.room.findMany({
                where: {
                    siteId: params.siteId,
                    isActive: true,
                    ...(servicio.requiredRoomKind ? { kind: servicio.requiredRoomKind } : {}),
                },
                select: { id: true },
            })
            : [];
        const equipos = servicio.requiredModality
            ? await this.prisma.equipment.findMany({
                where: { siteId: params.siteId, isActive: true, modality: servicio.requiredModality },
                select: { id: true },
            })
            : [];
        if (servicio.requiresRoom && !salas.length)
            return [];
        if (servicio.requiredModality && !equipos.length)
            return [];
        const desde = new Date(`${params.fecha}T00:00:00.000Z`);
        const hasta = new Date(`${params.fecha}T23:59:59.999Z`);
        const ocupados = await this.prisma.resourceBooking.findMany({
            where: { siteId: params.siteId, active: true, startsAt: { lt: hasta }, endsAt: { gt: desde } },
            select: { professionalId: true, roomId: true, equipmentId: true, startsAt: true, endsAt: true },
        });
        const libre = (recurso, ini, fin) => !recurso ||
            !ocupados.some((o) => (o.professionalId === recurso || o.roomId === recurso || o.equipmentId === recurso) &&
                o.startsAt < fin &&
                o.endsAt > ini);
        const huecos = [];
        for (const franja of franjas) {
            if (!habilitados.has(franja.professionalId))
                continue;
            if (franja.serviceIds.length && !franja.serviceIds.includes(params.serviceId))
                continue;
            const duracion = habilitados.get(franja.professionalId) ?? servicio.durationMin;
            const conBuffer = duracion + servicio.bufferMin;
            for (let min = franja.startMinute; min + duracion <= franja.endMinute; min += PASO_MIN) {
                const ini = enZona(params.fecha, min, sede.timezone);
                const fin = new Date(ini.getTime() + duracion * 60_000);
                const finConBuffer = new Date(ini.getTime() + conBuffer * 60_000);
                if (!libre(franja.professionalId, ini, finConBuffer))
                    continue;
                const sala = salas.find((s) => libre(s.id, ini, finConBuffer))?.id ?? null;
                if (servicio.requiresRoom && !sala)
                    continue;
                const equipo = equipos.find((e) => libre(e.id, ini, finConBuffer))?.id ?? null;
                if (servicio.requiredModality && !equipo)
                    continue;
                huecos.push({
                    inicio: ini,
                    fin,
                    professionalId: franja.professionalId,
                    professionalName: franja.professional.displayName,
                    roomId: sala,
                    equipmentId: equipo,
                });
            }
        }
        return huecos.sort((a, b) => a.inicio.getTime() - b.inicio.getTime());
    }
};
exports.AvailabilityService = AvailabilityService;
exports.AvailabilityService = AvailabilityService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AvailabilityService);
function enZona(fecha, minutos, timezone) {
    const desplazamientoHoras = timezone === 'America/Bogota' ? -5 : 0;
    const [a, m, d] = fecha.split('-').map(Number);
    return new Date(Date.UTC(a, m - 1, d) + minutos * 60_000 - desplazamientoHoras * 3_600_000);
}
//# sourceMappingURL=availability.service.js.map