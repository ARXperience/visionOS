import type { PrismaClient } from '@prisma/client';

/**
 * Interpreta la respuesta a un recordatorio.
 *
 * Deliberadamente tonto: se pide "1" o "2" y se acepta un puñado de formas
 * de decir lo mismo. Interpretar texto libre necesitaría un modelo, costaría
 * dinero por cada respuesta y se equivocaría justo en el caso que importa —
 * confundir "no puedo ir" con una confirmación deja un cupo muerto y un
 * paciente que cree que canceló.
 *
 * Lo que no encaja aquí NO se toca: se queda en el inbox para que lo lea una
 * persona. Es la respuesta correcta ante la duda.
 */
const CONFIRMA = /^\s*(1|s[ií]|si|confirmo|confirmado|ok|dale|listo|voy|asisto)\s*[.!]?\s*$/i;
const CANCELA = /^\s*(2|no|cancelo|cancelar|cancelado|no puedo|no voy|no asisto)\s*[.!]?\s*$/i;

export type Respuesta = 'CONFIRMA' | 'CANCELA' | null;

export function interpretar(texto: string | null): Respuesta {
  if (!texto) return null;
  if (CONFIRMA.test(texto)) return 'CONFIRMA';
  if (CANCELA.test(texto)) return 'CANCELA';
  return null;
}

/**
 * Aplica la respuesta a la cita más próxima de esa persona.
 *
 * Solo actúa si hay UNA cita candidata en las próximas 72 horas. Con dos, no
 * se adivina cuál: se deja para que lo resuelva una persona.
 */
export async function aplicarRespuesta(
  prisma: PrismaClient,
  personId: string,
  respuesta: Exclude<Respuesta, null>,
): Promise<boolean> {
  const candidatas = await prisma.appointment.findMany({
    where: {
      personId,
      status: { in: ['PROGRAMADA', 'CONFIRMADA'] },
      startsAt: { gte: new Date(), lte: new Date(Date.now() + 72 * 3600_000) },
    },
    select: { id: true, status: true, siteId: true },
    take: 2,
  });

  if (candidatas.length !== 1) return false;

  const cita = candidatas[0];
  const nuevo = respuesta === 'CONFIRMA' ? 'CONFIRMADA' : 'CANCELADA';
  if (cita.status === nuevo) return true;

  await prisma.$transaction(async (tx) => {
    await tx.appointment.update({
      where: { id: cita.id },
      data:
        nuevo === 'CONFIRMADA'
          ? { status: 'CONFIRMADA', confirmedAt: new Date() }
          : { status: 'CANCELADA', cancelledAt: new Date(), cancelActor: 'PACIENTE' },
    });

    if (nuevo === 'CANCELADA') {
      // Libera el cupo en la MISMA transaccion: separarlo dejaria el
      // recurso bloqueado sin cita que lo justifique.
      await tx.resourceBooking.updateMany({
        where: { appointmentId: cita.id },
        data: { active: false },
      });
    }

    await tx.appointmentStatusEvent.create({
      data: { appointmentId: cita.id, fromStatus: cita.status, toStatus: nuevo, bySystem: 'wa:respuesta' },
    });

    await tx.appointmentNotification.updateMany({
      where: { appointmentId: cita.id, outcome: 'ENVIADO' },
      data: { outcome: respuesta === 'CONFIRMA' ? 'CONFIRMO' : 'CANCELO', respondedAt: new Date() },
    });

    await tx.patientEvent.create({
      data: {
        personId,
        type: nuevo === 'CONFIRMADA' ? 'CITA_CONFIRMADA' : 'CITA_CANCELADA',
        title: nuevo === 'CONFIRMADA' ? 'Confirmó su cita por WhatsApp' : 'Canceló su cita por WhatsApp',
        siteId: cita.siteId,
        refType: 'appointment',
        refId: cita.id,
      },
    });
  });

  return true;
}
