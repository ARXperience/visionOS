import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { AnesthesiaType, Laterality, Prisma, User } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { TimelineService } from '../timeline/timeline.service';
import { type Fase, faltantes } from './lista-oms';

interface Ctx {
  actor: User;
  ip?: string | null;
}

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
} satisfies Prisma.SurgeryFindManyArgs['select'];

/**
 * Cirugía.
 *
 * La agenda no se reinventa: la cirugía cuelga de una Appointment, así que el
 * quirófano y el cirujano se reservan con las mismas ResourceBooking y la
 * misma restricción EXCLUDE de PostgreSQL que impide dos citas solapadas
 * impide dos cirugías en el mismo quirófano.
 *
 * Lo propio de este módulo es lo que no se puede hacer mal. Operar el ojo
 * equivocado es el evento adverso centinela de la oftalmología y es
 * enteramente prevenible; por eso las reglas de abajo son bloqueos duros y no
 * advertencias que alguien pueda cerrar con un clic.
 */
@Injectable()
export class SurgeriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly timeline: TimelineService,
  ) {}

  async programar(
    datos: {
      appointmentId: string;
      laterality: Laterality;
      surgeonId: string;
      anesthesiologistId?: string;
      anesthesia?: AnesthesiaType;
      teamNotes?: string;
    },
    ctx: Ctx,
  ) {
    // "Ambos ojos" no existe como programación quirúrgica: son dos cirugías,
    // en dos actos, con dos consentimientos. Dejarlo pasar es dejar abierta
    // la puerta a que la pausa quirúrgica no tenga nada que verificar.
    if (datos.laterality !== 'OD' && datos.laterality !== 'OI') {
      throw new BadRequestException(
        'Una cirugía se programa sobre UN ojo: OD u OI. Para ambos, programe dos cirugías.',
      );
    }

    const cita = await this.prisma.appointment.findUnique({
      where: { id: datos.appointmentId },
      select: { id: true, personId: true, siteId: true, status: true, surgery: { select: { id: true } } },
    });
    if (!cita) throw new NotFoundException('La cita no existe');
    if (cita.surgery) throw new ConflictException('Esa cita ya tiene una cirugía programada');
    if (cita.status === 'CANCELADA') {
      throw new BadRequestException('La cita está cancelada: reagéndela antes de programar la cirugía.');
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

    // La cita lleva su propia lateralidad y ahora debe decir lo mismo que la
    // cirugía. Dos fuentes que se contradicen es peor que una sola.
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

  listar(filtro: { siteId?: string; desde?: Date; hasta?: Date; status?: string; personId?: string }) {
    return this.prisma.surgery.findMany({
      where: {
        ...(filtro.siteId ? { siteId: filtro.siteId } : {}),
        ...(filtro.personId ? { personId: filtro.personId } : {}),
        ...(filtro.status ? { status: filtro.status as never } : {}),
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

  async ver(id: string, ctx: Ctx) {
    const c = await this.prisma.surgery.findUnique({ where: { id }, select: SELECT });
    if (!c) throw new NotFoundException('Cirugía no encontrada');

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

  async registrarConsentimiento(id: string, fileUrl: string | undefined, ctx: Ctx) {
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

  /**
   * Cierra una fase de la lista de la OMS.
   *
   * Guarda quién y cuándo, no solo qué: una lista sin responsable no es una
   * lista. Y en la pausa se vuelve a exigir el ojo, escrito otra vez por
   * quien está en el quirófano, porque el punto de la pausa es justamente que
   * alguien lo diga de nuevo en vez de heredarlo de la pantalla anterior.
   */
  async cerrarFase(
    id: string,
    fase: Fase,
    respuestas: Record<string, unknown>,
    lateralidadConfirmada: Laterality | undefined,
    ctx: Ctx,
  ) {
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
    if (!c) throw new NotFoundException('Cirugía no encontrada');
    if (c.status === 'SUSPENDIDA') throw new BadRequestException('La cirugía está suspendida.');

    if (fase === 'ENTRADA' && !c.consentSignedAt) {
      throw new BadRequestException(
        'No se puede completar la entrada sin el consentimiento informado firmado.',
      );
    }
    if (fase === 'PAUSA' && !c.entryAt) {
      throw new BadRequestException('Complete primero la verificación de entrada.');
    }
    if (fase === 'SALIDA' && !c.pauseAt) {
      throw new BadRequestException('No hubo pausa quirúrgica registrada.');
    }

    if (fase === 'PAUSA') {
      // El bloqueo que justifica todo el módulo.
      if (!lateralidadConfirmada) {
        throw new BadRequestException('Confirme el ojo a operar para cerrar la pausa quirúrgica.');
      }
      if (lateralidadConfirmada !== c.laterality) {
        await this.audit.record({
          userId: ctx.actor.id,
          action: 'UPDATE',
          entityType: 'surgery',
          entityId: id,
          personId: c.personId,
          siteId: c.siteId,
          // Queda registrado aunque se detenga: una discrepancia de
          // lateralidad es un cuasi-evento y hay que poder contarlos.
          newValues: { alerta: 'DISCREPANCIA_LATERALIDAD', programado: c.laterality, confirmado: lateralidadConfirmada },
          ipAddress: ctx.ip,
        });
        throw new ConflictException(
          `DETENGA EL PROCEDIMIENTO. Está programado ${c.laterality} y se confirmó ${lateralidadConfirmada}. ` +
            'Verifique la historia y la marcación antes de continuar.',
        );
      }
    }

    const faltan = faltantes(fase, respuestas);
    if (faltan.length) {
      throw new BadRequestException(`Faltan verificaciones obligatorias: ${faltan.join('; ')}`);
    }

    const campos =
      fase === 'ENTRADA'
        ? { entryAt: new Date(), entryById: ctx.actor.id, entryData: respuestas as Prisma.InputJsonValue }
        : fase === 'PAUSA'
          ? { pauseAt: new Date(), pauseById: ctx.actor.id, pauseData: respuestas as Prisma.InputJsonValue }
          : { exitAt: new Date(), exitById: ctx.actor.id, exitData: respuestas as Prisma.InputJsonValue };

    const actualizada = await this.prisma.surgery.update({
      where: { id },
      data: {
        ...campos,
        ...(fase === 'ENTRADA' ? { status: 'EN_PREPARACION' as const } : {}),
        ...(fase === 'PAUSA' ? { status: 'EN_QUIROFANO' as const } : {}),
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

  /** La incisión. Sin pausa quirúrgica no empieza. */
  async iniciar(id: string, ctx: Ctx) {
    const c = await this.prisma.surgery.findUnique({
      where: { id },
      select: { id: true, personId: true, pauseAt: true, startedAt: true, status: true },
    });
    if (!c) throw new NotFoundException('Cirugía no encontrada');
    if (!c.pauseAt) {
      throw new BadRequestException(
        'No se puede iniciar sin la pausa quirúrgica: es donde se confirma el ojo.',
      );
    }
    if (c.startedAt) throw new BadRequestException('Ya está iniciada.');

    return this.prisma.surgery.update({
      where: { id },
      data: { startedAt: new Date() },
      select: { id: true, startedAt: true, status: true },
    });
  }

  async finalizar(
    id: string,
    datos: { findings?: string; complications?: string },
    ctx: Ctx,
  ) {
    const c = await this.prisma.surgery.findUnique({
      where: { id },
      select: { id: true, personId: true, siteId: true, startedAt: true, exitAt: true, laterality: true, appointmentId: true },
    });
    if (!c) throw new NotFoundException('Cirugía no encontrada');
    if (!c.startedAt) throw new BadRequestException('La cirugía no fue iniciada.');
    if (!c.exitAt) {
      throw new BadRequestException(
        'Complete la verificación de salida antes de cerrar: es donde se cuenta el instrumental.',
      );
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

  async suspender(id: string, motivo: string, ctx: Ctx) {
    const c = await this.prisma.surgery.findUnique({
      where: { id },
      select: { id: true, personId: true, siteId: true, startedAt: true },
    });
    if (!c) throw new NotFoundException('Cirugía no encontrada');
    if (c.startedAt) {
      throw new BadRequestException(
        'Una cirugía ya iniciada no se suspende: se finaliza registrando lo que ocurrió.',
      );
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

  /**
   * Implante con lote y serie.
   *
   * Se registra por separado y no como texto libre por una sola pregunta, la
   * del día de un retiro del mercado: qué pacientes tienen un lente de este
   * lote. Con los datos en un párrafo esa consulta no se puede responder.
   */
  async registrarImplante(
    id: string,
    datos: { kind: string; brand?: string; model?: string; power?: number; lot?: string; serial?: string; invima?: string },
    ctx: Ctx,
  ) {
    const c = await this.prisma.surgery.findUnique({ where: { id }, select: { personId: true } });
    if (!c) throw new NotFoundException('Cirugía no encontrada');

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

  /** Qué pacientes tienen un implante de este lote o esta serie. */
  async trazabilidad(busqueda: { lot?: string; serial?: string; model?: string }) {
    if (!busqueda.lot && !busqueda.serial && !busqueda.model) {
      throw new BadRequestException('Indique lote, serie o modelo.');
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

  /** Indicadores del quirófano. */
  async indicadores(siteId?: string) {
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
      // El número que hay que mirar antes de que empiece la jornada.
      pendientesDeConsentimiento: sinConsentimiento,
    };
  }
}
