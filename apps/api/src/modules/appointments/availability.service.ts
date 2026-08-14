import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';

export interface Hueco {
  inicio: Date;
  fin: Date;
  professionalId: string;
  professionalName: string;
  roomId: string | null;
  equipmentId: string | null;
}

/** Paso de la rejilla de horarios. 15 min es lo que usa cualquier agenda clínica. */
const PASO_MIN = 15;

/**
 * Qué cupos se pueden ofrecer.
 *
 * Esto es un CÁLCULO, y puede quedarse obsoleto entre que se muestra y se
 * confirma: dos personas pueden ver el mismo hueco. No pasa nada — la red
 * que atrapa esa carrera es el EXCLUDE de la base, no esta función. Aquí se
 * busca ser rápido y razonable; la corrección la garantiza PostgreSQL.
 */
@Injectable()
export class AvailabilityService {
  constructor(private readonly prisma: PrismaService) {}

  async huecos(params: {
    siteId: string;
    serviceId: string;
    fecha: string;
    professionalId?: string;
  }): Promise<Hueco[]> {
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
    if (!servicio) throw new NotFoundException('Servicio no encontrado');

    const sede = await this.prisma.site.findUnique({
      where: { id: params.siteId },
      select: { timezone: true },
    });
    if (!sede) throw new NotFoundException('Sede no encontrada');

    // Los festivos están sembrados, no se recalculan: la ley Emiliani mueve
    // varios al lunes siguiente y esa regla no se reimplementa aquí.
    const esFestivo = await this.prisma.holiday.findUnique({
      where: { date: new Date(`${params.fecha}T00:00:00.000Z`) },
      select: { date: true },
    });
    if (esFestivo) return [];

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
    if (!franjas.length) return [];

    // Quién puede prestar este servicio. Sin fila en ServiceProfessional, no
    // puede: es la diferencia entre "hay hueco" y "hay quien lo atienda".
    const habilitados = new Map(
      servicio.professionals.map((p) => [p.professionalId, p.durationMin]),
    );

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

    // Si el servicio exige un recurso que la sede no tiene, no hay huecos:
    // ofrecerlos sería agendar un OCT donde no hay OCT.
    if (servicio.requiresRoom && !salas.length) return [];
    if (servicio.requiredModality && !equipos.length) return [];

    const desde = new Date(`${params.fecha}T00:00:00.000Z`);
    const hasta = new Date(`${params.fecha}T23:59:59.999Z`);

    const ocupados = await this.prisma.resourceBooking.findMany({
      where: { siteId: params.siteId, active: true, startsAt: { lt: hasta }, endsAt: { gt: desde } },
      select: { professionalId: true, roomId: true, equipmentId: true, startsAt: true, endsAt: true },
    });

    const libre = (recurso: string | null, ini: Date, fin: Date) =>
      !recurso ||
      !ocupados.some(
        (o) =>
          (o.professionalId === recurso || o.roomId === recurso || o.equipmentId === recurso) &&
          o.startsAt < fin &&
          o.endsAt > ini,
      );

    const huecos: Hueco[] = [];

    for (const franja of franjas) {
      if (!habilitados.has(franja.professionalId)) continue;
      if (franja.serviceIds.length && !franja.serviceIds.includes(params.serviceId)) continue;

      const duracion = habilitados.get(franja.professionalId) ?? servicio.durationMin;
      const conBuffer = duracion + servicio.bufferMin;

      for (let min = franja.startMinute; min + duracion <= franja.endMinute; min += PASO_MIN) {
        const ini = enZona(params.fecha, min, sede.timezone);
        const fin = new Date(ini.getTime() + duracion * 60_000);
        const finConBuffer = new Date(ini.getTime() + conBuffer * 60_000);

        if (!libre(franja.professionalId, ini, finConBuffer)) continue;

        const sala = salas.find((s) => libre(s.id, ini, finConBuffer))?.id ?? null;
        if (servicio.requiresRoom && !sala) continue;

        const equipo = equipos.find((e) => libre(e.id, ini, finConBuffer))?.id ?? null;
        if (servicio.requiredModality && !equipo) continue;

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
}

/**
 * Minutos locales de la sede a instante UTC.
 *
 * Colombia es UTC-5 fijo y sin horario de verano, así que se resuelve con el
 * desplazamiento y no con una librería de zonas horarias. Si algún día la
 * clínica abriera fuera de Colombia, este es el punto donde entra `Temporal`
 * o `date-fns-tz` — y está aislado en una sola función a propósito.
 *
 * ponytail: desplazamiento fijo; librería de zonas si hay sedes fuera de Colombia.
 */
export function enZona(fecha: string, minutos: number, timezone: string): Date {
  const desplazamientoHoras = timezone === 'America/Bogota' ? -5 : 0;
  const [a, m, d] = fecha.split('-').map(Number);

  // Medianoche local + los minutos, y de ahí a UTC restando el
  // desplazamiento: 08:00 en Bogotá (UTC-5) son las 13:00 UTC.
  return new Date(
    Date.UTC(a, m - 1, d) + minutos * 60_000 - desplazamientoHoras * 3_600_000,
  );
}
