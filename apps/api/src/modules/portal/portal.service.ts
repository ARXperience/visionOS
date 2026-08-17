import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

/**
 * Portal del paciente, SIN login.
 *
 * El plan dice desde el principio que no se construye un portal con
 * contraseña: nadie recuerda otra clave para ver la hora de una cita, y una
 * base de credenciales de pacientes es una superficie de ataque nueva a
 * cambio de nada. WhatsApp ya es la aplicación del paciente.
 *
 * Lo que sí hace falta es que el enlace del recordatorio lleve a algún lado.
 * Esto es eso: el código público de la cita —VC-4F7K2— más los últimos cuatro
 * del documento. Dos datos que solo tiene quien recibió el mensaje.
 *
 * Se devuelve deliberadamente POCO: hora, sede, servicio y preparación. Ni
 * diagnóstico, ni resultados, ni teléfono, ni el nombre completo del
 * profesional. Una URL adivinable no puede ser una fuga de datos de salud.
 */
@Injectable()
export class PortalService {
  private readonly log = new Logger('Portal');
  /** Intentos por IP: código + documento es adivinable a fuerza bruta. */
  private readonly intentos = new Map<string, { n: number; hasta: number }>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private frenar(ip: string) {
    const ahora = Date.now();
    const previo = this.intentos.get(ip);

    if (previo && previo.hasta > ahora && previo.n >= 10) {
      throw new BadRequestException('Demasiados intentos. Espere unos minutos.');
    }
    if (!previo || previo.hasta <= ahora) {
      this.intentos.set(ip, { n: 1, hasta: ahora + 600_000 });
    } else {
      previo.n += 1;
    }

    // ponytail: contador en memoria. Con un solo proceso alcanza; el día que
    // haya varias instancias, esto va a Postgres o a Redis.
    if (this.intentos.size > 5_000) this.intentos.clear();
  }

  async consultar(codigo: string, ultimos4: string, ip: string) {
    this.frenar(ip);

    const code = codigo.trim().toUpperCase();
    const cuatro = ultimos4.trim();
    if (!/^[A-Z0-9-]{5,12}$/.test(code) || !/^\d{4}$/.test(cuatro)) {
      throw new BadRequestException('Revise el código de la cita y los últimos cuatro dígitos de su documento.');
    }

    const cita = await this.prisma.appointment.findUnique({
      where: { publicCode: code },
      select: {
        id: true,
        publicCode: true,
        startsAt: true,
        status: true,
        laterality: true,
        person: { select: { id: true, docNumber: true, firstName: true } },
        service: { select: { name: true, preparationNotes: true, requiresDilation: true } },
        site: { select: { name: true, address: true, phone: true } },
      },
    });

    // El mismo mensaje para "no existe" y "no coincide": distinguirlos
    // convierte esto en un oráculo para saber qué códigos son reales.
    const noCoincide = !cita || !cita.person.docNumber?.endsWith(cuatro);
    if (noCoincide) {
      this.log.warn(`Consulta fallida de portal desde ${ip} para ${code}`);
      throw new NotFoundException('No encontramos una cita con esos datos.');
    }

    await this.audit.record({
      action: 'READ',
      entityType: 'portal',
      entityId: cita.id,
      personId: cita.person.id,
      newValues: { via: 'portal publico' },
      ipAddress: ip,
    });

    return {
      codigo: cita.publicCode,
      // Solo el nombre de pila: si alguien acierta el código, no se lleva la
      // identidad completa de nadie.
      paciente: cita.person.firstName,
      cuando: cita.startsAt,
      estado: cita.status,
      servicio: cita.service.name,
      ojo: cita.laterality === 'NA' ? null : cita.laterality,
      preparacion: cita.service.preparationNotes,
      requiereDilatacion: cita.service.requiresDilation,
      sede: { nombre: cita.site.name, direccion: cita.site.address, telefono: cita.site.phone },
      puedeConfirmar: cita.status === 'PROGRAMADA',
      puedeCancelar: ['PROGRAMADA', 'CONFIRMADA'].includes(cita.status),
    };
  }

  /**
   * Confirmar y cancelar son las dos únicas acciones. Reagendar NO: elegir
   * hora exige ver la disponibilidad real y eso sí es una aplicación con
   * sesión. Para cambiar la hora, el paciente escribe por WhatsApp, que es
   * donde hay alguien —o el asistente— para atenderlo.
   */
  async responder(codigo: string, ultimos4: string, accion: 'confirmar' | 'cancelar', ip: string) {
    const cita = await this.consultar(codigo, ultimos4, ip);

    if (accion === 'confirmar' && !cita.puedeConfirmar) {
      throw new BadRequestException('Esa cita ya no se puede confirmar.');
    }
    if (accion === 'cancelar' && !cita.puedeCancelar) {
      throw new BadRequestException('Esa cita ya no se puede cancelar.');
    }

    const registro = await this.prisma.appointment.findUniqueOrThrow({
      where: { publicCode: cita.codigo },
      select: { id: true, personId: true, siteId: true, status: true },
    });

    const nuevo = accion === 'confirmar' ? 'CONFIRMADA' : 'CANCELADA';

    await this.prisma.$transaction(async (tx) => {
      await tx.appointment.update({ where: { id: registro.id }, data: { status: nuevo } });
      await tx.appointmentStatusEvent.create({
        data: {
          appointmentId: registro.id,
          fromStatus: registro.status,
          toStatus: nuevo,
          // Queda claro que lo hizo el paciente y no el mostrador: si mañana
          // reclama que él no canceló, el rastro lo dice.
          bySystem: 'portal',
          reason: 'Acción del paciente desde el portal público',
        },
      });

      if (accion === 'cancelar') {
        // Liberar el cupo es la mitad del valor de cancelar. Sin esto, la
        // agenda sigue bloqueada y el cupo no se le puede ofrecer a nadie.
        await tx.resourceBooking.updateMany({
          where: { appointmentId: registro.id },
          data: { active: false },
        });
      }
    });

    await this.audit.record({
      action: 'UPDATE',
      entityType: 'appointment',
      entityId: registro.id,
      personId: registro.personId,
      siteId: registro.siteId,
      newValues: { estado: nuevo, via: 'portal publico' },
      ipAddress: ip,
    });

    return {
      codigo: cita.codigo,
      estado: nuevo,
      mensaje:
        accion === 'confirmar'
          ? 'Cita confirmada. Lo esperamos.'
          : 'Cita cancelada. Puede escribirnos por WhatsApp para tomar otra.',
    };
  }
}
