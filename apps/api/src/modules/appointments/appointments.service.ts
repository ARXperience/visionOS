import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, type AppointmentStatus, type CancelActor, type User } from '@prisma/client';
import { randomBytes } from 'node:crypto';

import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

/** Violación del EXCLUDE: el cupo se ocupó entre que se mostró y se confirmó. */
const SOLAPAMIENTO = '23P01';

/** Transiciones permitidas. Lo que no está aquí, no ocurre. */
const RUTA: Record<AppointmentStatus, AppointmentStatus[]> = {
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

/** Marcas desnormalizadas para que el tablero del día sea una consulta. */
const MARCA: Partial<Record<AppointmentStatus, string>> = {
  CONFIRMADA: 'confirmedAt',
  LLEGO: 'arrivedAt',
  EN_ATENCION: 'attendedAt',
  FINALIZADA: 'completedAt',
};

@Injectable()
export class AppointmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Crea la cita y SUS reservas en una sola transacción.
   *
   * Si cualquiera de los recursos está ocupado, PostgreSQL lanza 23P01 y toda
   * la transacción se deshace: no queda una cita a medias con el médico
   * reservado y el equipo no. Ese error se traduce a un 409 con un mensaje
   * que una recepcionista entiende.
   */
  async crear(
    datos: {
      siteId: string;
      personId: string;
      serviceId: string;
      professionalId: string;
      roomId?: string | null;
      equipmentId?: string | null;
      startsAt: Date;
      laterality?: 'OD' | 'OI' | 'AO' | 'NA';
      notes?: string;
      conversationId?: string;
      createdVia?: 'BAILEYS' | 'WEB' | 'TELEFONO' | 'PRESENCIAL';
    },
    ctx: { user?: User | null; ip?: string | null },
  ) {
    const servicio = await this.prisma.service.findUnique({
      where: { id: datos.serviceId },
      select: {
        durationMin: true,
        bufferMin: true,
        professionals: { where: { professionalId: datos.professionalId }, select: { durationMin: true } },
      },
    });
    if (!servicio) throw new NotFoundException('Servicio no encontrado');

    const duracion = servicio.professionals[0]?.durationMin ?? servicio.durationMin;
    const fin = new Date(datos.startsAt.getTime() + duracion * 60_000);
    // El recurso queda ocupado también durante la limpieza.
    const finReserva = new Date(fin.getTime() + servicio.bufferMin * 60_000);

    const reservas = [
      { kind: 'PROFESSIONAL' as const, professionalId: datos.professionalId },
      ...(datos.roomId ? [{ kind: 'ROOM' as const, roomId: datos.roomId }] : []),
      ...(datos.equipmentId ? [{ kind: 'EQUIPMENT' as const, equipmentId: datos.equipmentId }] : []),
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

        // Quien agenda ve el nombre y el teléfono del paciente.
        await tx.person.update({
          where: { id: datos.personId },
          data: { isPatient: true, patientSince: new Date() },
        });

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
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError || esSolapamiento(e)) {
        if (esSolapamiento(e)) {
          throw new ConflictException(
            'Ese cupo acaba de ocuparse. Actualice la disponibilidad y elija otro.',
          );
        }
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
          throw new ConflictException('Ese paciente ya tiene ese servicio agendado a esa hora.');
        }
      }
      throw e;
    }
  }

  /**
   * Cambia el estado y deja constancia. La liberación del cupo va en la MISMA
   * transacción que la cancelación: si se separaran, una cancelación a medias
   * dejaría el recurso bloqueado para siempre y nadie sabría por qué.
   */
  async cambiarEstado(
    id: string,
    nuevo: AppointmentStatus,
    ctx: { user?: User | null; motivo?: string; actor?: CancelActor },
  ) {
    const cita = await this.prisma.appointment.findUnique({
      where: { id },
      select: { id: true, status: true, personId: true, siteId: true },
    });
    if (!cita) throw new NotFoundException('Cita no encontrada');

    if (!RUTA[cita.status].includes(nuevo)) {
      throw new ConflictException(
        `Una cita ${cita.status.toLowerCase()} no puede pasar a ${nuevo.toLowerCase()}.`,
      );
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

      return actualizada;
    });
  }

  /** La agenda de un día, para la pantalla de la sede. */
  agenda(siteId: string, fecha: string) {
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
}

const esSolapamiento = (e: unknown): boolean =>
  e instanceof Prisma.PrismaClientUnknownRequestError
    ? e.message.includes(SOLAPAMIENTO)
    : typeof e === 'object' && e !== null && 'code' in e && e.code === SOLAPAMIENTO;

/**
 * VC-4F7K2. Corto para decirlo por teléfono, sin caracteres que se confundan
 * al dictarlo: nada de 0/O ni 1/I/L.
 */
function codigoPublico(): string {
  const alfabeto = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  const bytes = randomBytes(5);
  return `VC-${[...bytes].map((b) => alfabeto[b % alfabeto.length]).join('')}`;
}
