import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, type ProfessionalType, type User } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

interface Ctx {
  actor: User;
  ip?: string | null;
}

@Injectable()
export class ProfessionalsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

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

  async crear(
    datos: {
      docNumber: string;
      firstName: string;
      lastName: string;
      type: ProfessionalType;
      licenseNumber?: string;
      specialties?: string[];
      color?: string;
      siteIds: string[];
    },
    ctx: Ctx,
  ) {
    if (!datos.siteIds.length) {
      throw new BadRequestException('Asigne al menos una sede donde atienda.');
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
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('Ya existe un profesional con ese documento.');
      }
      throw e;
    }
  }

  /**
   * Qué servicios presta. Sin fila en `ServiceProfessional` no aparece en la
   * disponibilidad de ese servicio: es la diferencia entre "hay hueco en la
   * agenda" y "hay quien lo atienda".
   */
  async asignarServicios(id: string, serviceIds: string[], ctx: Ctx) {
    await this.prisma.professional.findUniqueOrThrow({ where: { id }, select: { id: true } });

    await this.prisma.$transaction(async (tx) => {
      // Se conservan los `durationMin` propios de los servicios que siguen:
      // reescribirlos borraría que la Dra. X hace catarata en 40 y no en 60.
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

  /**
   * Franja semanal de atención. Se valida el solapamiento con las franjas
   * que ya tiene ese profesional en esa sede: dos franjas superpuestas no
   * rompen nada, pero producen cupos duplicados en la disponibilidad y el
   * paciente ve la misma hora dos veces.
   */
  async agregarFranja(
    datos: { professionalId: string; siteId: string; weekday: number; inicio: string; fin: string },
    ctx: Ctx,
  ) {
    const startMinute = aMinutos(datos.inicio);
    const endMinute = aMinutos(datos.fin);

    if (endMinute <= startMinute) {
      throw new BadRequestException('La hora de fin debe ser posterior a la de inicio.');
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
      throw new ConflictException(
        `Se cruza con la franja de ${aHora(solapa.startMinute)} a ${aHora(solapa.endMinute)}.`,
      );
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

  /**
   * Quitar una franja NO cancela las citas ya agendadas dentro de ella.
   *
   * Es deliberado: borrar la disponibilidad de un martes no puede dejar sin
   * cita a los pacientes que ya la tienen. Se avisa cuántas hay para que
   * alguien las reagende a mano.
   */
  async quitarFranja(id: string, ctx: Ctx) {
    const f = await this.prisma.professionalAvailability.findUnique({
      where: { id },
      select: { professionalId: true, siteId: true, weekday: true, startMinute: true, endMinute: true },
    });
    if (!f) throw new NotFoundException('Franja no encontrada');

    // Citas futuras del profesional en ese día de la semana y esa hora.
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
      aviso:
        futuras > 0
          ? `Este profesional tiene ${futuras} cita(s) futura(s). Quitar la franja no las cancela: revíselas.`
          : null,
    };
  }

  /**
   * Bloquea la agenda de un profesional: vacaciones, congreso, incapacidad.
   *
   * Es una reserva de recurso SIN cita. El mismo EXCLUDE que impide la doble
   * reserva la protege, así que no hace falta ni una línea de lógica nueva —
   * y si ya hay una cita ahí, la base lo rechaza en vez de dejar al paciente
   * con una cita que nadie va a atender.
   */
  async bloquear(
    datos: { professionalId: string; siteId: string; desde: string; hasta: string; motivo: string },
    ctx: Ctx,
  ) {
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
    } catch (e) {
      if (String(e).includes('23P01')) {
        throw new ConflictException(
          'Ya hay una cita en ese rango. Reagéndela antes de bloquear la agenda.',
        );
      }
      throw e;
    }
  }

  bloqueos(professionalId: string) {
    return this.prisma.resourceBooking.findMany({
      where: { professionalId, appointmentId: null, active: true, endsAt: { gte: new Date() } },
      orderBy: { startsAt: 'asc' },
      select: { id: true, startsAt: true, endsAt: true, blockReason: true, site: { select: { code: true } } },
    });
  }

  quitarBloqueo(id: string) {
    return this.prisma.resourceBooking.update({
      where: { id },
      data: { active: false },
      select: { id: true },
    });
  }

  async cambiarEstado(id: string, activo: boolean, ctx: Ctx) {
    // Desactivar a un profesional no cancela sus citas: solo deja de
    // ofrecerse en disponibilidad. Las que ya existen las atiende o las
    // reagenda una persona.
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
      aviso:
        !activo && futuras > 0
          ? `Tiene ${futuras} cita(s) futura(s). Desactivarlo no las cancela: revíselas.`
          : null,
    };
  }
}

const aMinutos = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

const aHora = (min: number) =>
  `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
