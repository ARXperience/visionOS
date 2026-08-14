import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import { ConversationsService } from '../conversations/conversations.service';

/**
 * Recordatorios, confirmación y barrido de no-show.
 *
 * SIN Redis ni cola. La entrega exactamente-una-vez la da el índice único
 * (appointmentId, kind) de `appointment_notifications`: el planificador
 * puede correr dos veces, solaparse consigo mismo o reiniciarse a mitad, y
 * el paciente recibe un solo mensaje. Añadir BullMQ habría metido Redis en
 * la pila para conseguir la misma garantía que ya da una restricción de la
 * base.
 *
 * ponytail: cron en proceso; pasar a cola si hay varias instancias del API.
 */
@Injectable()
export class RemindersService {
  private readonly logger = new Logger(RemindersService.name);

  /**
   * Ventana de envío. Los recordatorios son el mayor riesgo de que WhatsApp
   * cierre el número: son salientes, en lote, y a veces a números que no
   * iniciaron la conversación. Nunca de madrugada.
   */
  private readonly HORA_MIN = 7;
  private readonly HORA_MAX = 20;

  /** Tope por pasada. Un lote grande de golpe es el patrón que detectan. */
  private readonly POR_TANDA = 15;

  constructor(
    private readonly prisma: PrismaService,
    private readonly conversaciones: ConversationsService,
  ) {}

  /**
   * Programa los recordatorios de las citas de los próximos días.
   *
   * Programar y enviar están separados a propósito: así se puede ver qué se
   * va a mandar antes de que salga, y un fallo al enviar no pierde la
   * programación.
   */
  @Cron(CronExpression.EVERY_30_MINUTES)
  async programar(): Promise<number> {
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
      ] as const) {
        const cuando = new Date(cita.startsAt.getTime() - horas * 3600_000);
        if (cuando < desde) continue;

        try {
          await this.prisma.appointmentNotification.create({
            data: { appointmentId: cita.id, kind, scheduledFor: cuando },
          });
          creados += 1;
        } catch (e) {
          // P2002: ya estaba programado. Es el caso normal, no un error.
          if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002')) throw e;
        }
      }
    }

    if (creados) this.logger.log(`${creados} recordatorios programados`);
    return creados;
  }

  /** Envía lo que ya toca, dentro del horario y con tope por tanda. */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async enviar(): Promise<number> {
    const hora = Number(
      new Date().toLocaleString('en-US', { timeZone: 'America/Bogota', hour: '2-digit', hour12: false }),
    );
    if (hora < this.HORA_MIN || hora >= this.HORA_MAX) return 0;

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

      // Una cita cancelada entre la programación y el envío no se recuerda.
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

      // Sin conversación previa no se escribe. Iniciar un chat con alguien
      // que nunca escribió es exactamente el patrón que hace que WhatsApp
      // cierre un número.
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
      } catch (e) {
        await this.prisma.appointmentNotification.update({
          where: { id: n.id },
          data: { attempts: { increment: 1 }, error: (e as Error).message.slice(0, 300) },
        });
      }

      // Espaciado irregular entre envíos: un lote a intervalo exacto es
      // legible como automatización.
      await pausa(1500 + Math.floor(Math.random() * 2500));
    }

    if (enviados) this.logger.log(`${enviados} recordatorios enviados`);
    return enviados;
  }

  /**
   * Marca no-show las citas que pasaron sin que nadie hiciera check-in.
   *
   * Se espera media hora larga: el paciente que llega tarde sigue siendo un
   * paciente que llegó, y marcarlo ausente antes de tiempo ensucia el
   * indicador que justamente se quiere medir.
   */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async barrerNoShow(): Promise<number> {
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

    if (vencidas.length) this.logger.log(`${vencidas.length} citas marcadas como no asistió`);
    return vencidas.length;
  }
}

const pausa = (ms: number) => new Promise((r) => setTimeout(r, ms));

function texto(
  kind: string,
  cita: {
    publicCode: string;
    startsAt: Date;
    service: { name: string; preparationNotes: string | null; requiresDilation: boolean };
    site: { name: string; address: string };
  },
): string {
  const cuando = cita.startsAt.toLocaleString('es-CO', {
    timeZone: 'America/Bogota',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });

  if (kind === 'RECORDATORIO_2H') {
    return `Le recordamos su cita de ${cita.service.name} hoy a las ${cita.startsAt.toLocaleTimeString(
      'es-CO',
      { timeZone: 'America/Bogota', hour: '2-digit', minute: '2-digit' },
    )}, en ${cita.site.name}. ¡Le esperamos!`;
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
  if (cita.service.preparationNotes) partes.push(cita.service.preparationNotes);

  // La respuesta se parsea después: por eso las opciones son 1 y 2 y no
  // texto libre, que habría que interpretar con un modelo.
  partes.push('', `Responda *1* para confirmar o *2* para cancelar. (${cita.publicCode})`);
  return partes.join('\n');
}
