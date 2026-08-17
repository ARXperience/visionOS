import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';

/**
 * Automatizaciones.
 *
 * Aquí NO hay un motor de reglas configurable, y es una decisión, no una
 * carencia. Un constructor de "si pasa X entonces Y" es un lenguaje de
 * programación con interfaz gráfica: hay que mantenerlo, versionarlo, probar
 * lo que la gente arma con él y depurar por qué la regla que alguien escribió
 * un martes le mandó cuatro mensajes al mismo paciente. El plan lo dice desde
 * el principio: reglas en código hasta que existan diez reales. Hoy hay
 * cuatro.
 *
 * Lo que sí hacía falta es esta pantalla: saber qué corre solo, cada cuánto,
 * y si está funcionando. Una automatización invisible es una que nadie
 * apagará cuando empiece a hacer daño.
 */
@Injectable()
export class AutomationsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Cada regla declara qué hace y cómo comprobar que corrió. La comprobación
   * es lo que la vuelve honesta: "está activa" no significa que funcione.
   */
  async estado() {
    const hace24h = new Date(Date.now() - 86_400_000);
    const hace7d = new Date(Date.now() - 7 * 86_400_000);

    const [programados, enviados24h, fallidos7d, noShowAuto, pendientes, conversacionesIA] =
      await Promise.all([
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

    // Un recordatorio que debía salir hace horas y sigue sin salir es el
    // síntoma de que el planificador está caído, y es lo único de esta
    // pantalla que exige actuar hoy.
    const atrasoMinutos = pendientes[0]
      ? Math.floor((Date.now() - pendientes[0].scheduledFor.getTime()) / 60_000)
      : 0;

    return {
      reglas: [
        {
          id: 'recordatorio-24h',
          nombre: 'Recordatorio a 24 horas',
          descripcion:
            'Programa un WhatsApp el día antes de la cita. La unicidad es de la base: un índice único sobre (cita, tipo) impide que se envíe dos veces aunque el planificador corra en paralelo.',
          frecuencia: 'Se planifica cada 30 minutos; se envía cada 5',
          activa: true,
          comprobacion: `${enviados24h} enviados en las últimas 24 h`,
        },
        {
          id: 'recordatorio-2h',
          nombre: 'Recordatorio a 2 horas',
          descripcion:
            'El segundo aviso, el que de verdad baja el no-show. Solo sale a quien ya conversó con la clínica.',
          frecuencia: 'Cada 5 minutos',
          activa: true,
          comprobacion: `${programados} en cola`,
        },
        {
          id: 'no-show',
          nombre: 'Marcar inasistencia sola',
          descripcion:
            'Una cita que pasó su hora sin check-in se marca NO_ASISTIO sin que nadie tenga que acordarse. Queda como evento del sistema, distinguible de uno marcado por una persona.',
          frecuencia: 'Cada 10 minutos',
          activa: true,
          comprobacion: `${noShowAuto} marcadas solas en 7 días`,
        },
        {
          id: 'asistente',
          nombre: 'Respuesta automática del asistente',
          descripcion:
            'Responde en WhatsApp con cinco herramientas y escala a un humano ante cualquier síntoma. Se apaga por conversación desde el inbox.',
          frecuencia: 'En cada mensaje entrante',
          activa: Boolean(process.env.OPENAI_API_KEY),
          comprobacion: process.env.OPENAI_API_KEY
            ? `${conversacionesIA} conversaciones con IA activa`
            : 'Sin clave de proveedor: nunca ha respondido a un paciente',
        },
      ],
      salud: {
        enCola: programados,
        // Si esto pasa de una hora, el planificador no está corriendo.
        atrasoMinutos,
        fallidosUltimos7Dias: fallidos7d,
      },
    };
  }

  /** Los últimos envíos, para poder mirar qué salió y qué no. */
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
}
