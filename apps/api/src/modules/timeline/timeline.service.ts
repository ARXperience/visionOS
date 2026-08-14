import { Injectable, Logger } from '@nestjs/common';
import type { PatientEventType, Prisma, PrismaClient } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

export interface Evento {
  personId: string;
  type: PatientEventType;
  title: string;
  siteId?: string | null;
  actorUserId?: string | null;
  refType?: string;
  refId?: string;
  occurredAt?: Date;
  payload?: Prisma.InputJsonValue;
}

/**
 * El cliente dentro de una `$transaction`, o el cliente suelto. Se toma el
 * tipo del propio callback de Prisma en vez de escribirlo a mano: la lista
 * de métodos que Prisma quita en una transacción cambia entre versiones y
 * mantenerla sincronizada a mano solo produce errores de compilación raros.
 */
type Cliente = PrismaService | Parameters<Parameters<PrismaClient['$transaction']>[0]>[0];

/**
 * La ÚNICA puerta de escritura de la línea de tiempo.
 *
 * `patient_events` es una proyección duplicada del estado real, y lo que la
 * mantiene honesta es que solo se escriba desde aquí y que se pueda
 * reconstruir entera (`scripts/reconstruir-timeline.ts`). Si cada módulo
 * insertara por su cuenta, la deriva pasaría de inconveniente a incidente.
 *
 * Se emite DENTRO de la transacción del cambio que lo origina: si la
 * transacción falla no hay evento, y si tiene éxito el evento existe. Esa es
 * exactamente la garantía que se busca, y por eso no hay cola ni outbox.
 */
@Injectable()
export class TimelineService {
  private readonly logger = new Logger(TimelineService.name);

  constructor(private readonly prisma: PrismaService) {}

  async emitir(e: Evento, tx?: Cliente): Promise<void> {
    const cliente = tx ?? this.prisma;
    try {
      await cliente.patientEvent.create({
        data: {
          personId: e.personId,
          type: e.type,
          title: e.title,
          siteId: e.siteId ?? null,
          actorUserId: e.actorUserId ?? null,
          refType: e.refType,
          refId: e.refId,
          occurredAt: e.occurredAt ?? new Date(),
          payload: e.payload ?? {},
        },
      });
    } catch (err) {
      // Dentro de una transacción esto la haría fallar entera, que es lo
      // correcto. Fuera de ella, un fallo al proyectar no puede impedir que
      // se atienda a un paciente: se registra y se sigue, y el script de
      // reconstrucción lo recupera después.
      if (tx) throw err;
      this.logger.error(`No se pudo proyectar ${e.type}: ${(err as Error).message}`);
    }
  }

  /**
   * El recorrido completo de una persona, en UNA consulta indexada.
   *
   * Ese es todo el motivo de que la tabla exista. Con un UNION de quince
   * tablas, cada módulo nuevo —facturación, óptica, cirugía— obligaría a
   * reescribir la consulta más cara del sistema; así solo insertan una fila.
   */
  recorrido(personId: string, limite = 100) {
    return this.prisma.patientEvent.findMany({
      where: { personId },
      orderBy: { occurredAt: 'desc' },
      take: limite,
      select: {
        id: true,
        type: true,
        title: true,
        occurredAt: true,
        refType: true,
        refId: true,
        payload: true,
        site: { select: { code: true } },
        actor: { select: { firstName: true, lastName: true } },
      },
    });
  }
}
