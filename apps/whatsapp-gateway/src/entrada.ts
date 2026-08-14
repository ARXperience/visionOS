import type { PrismaClient } from '@prisma/client';

import { aplicarRespuesta, interpretar } from './confirmacion.js';

/**
 * Un mensaje que entra crea, si hace falta, la persona y la conversación.
 *
 * La persona se crea en el PRIMER contacto, aunque solo pregunte un precio y
 * no vuelva nunca. Es la decisión del Core Vision: si el lead viviera en otra
 * tabla y se "convirtiera" después en paciente, habría que re-parentar la
 * conversación y los mensajes justo en el punto que la clínica quiere ver
 * entero — "escribió por WhatsApp → pidió información → agendó".
 */
export interface Entrante {
  channelId: string;
  externalId: string;
  /** remoteJid: 573001234567@s.whatsapp.net */
  de: string;
  nombre: string | null;
  texto: string | null;
  tipo: string;
  recibidoEn: Date;
}

/** De remoteJid a E.164, que es como se guardan los teléfonos. */
export function aE164(jid: string): string {
  const solo = jid.split('@')[0].split(':')[0].replace(/\D/g, '');
  return `+${solo}`;
}

export async function guardarEntrante(prisma: PrismaClient, m: Entrante): Promise<void> {
  const telefono = aE164(m.de);

  // Todo en una transacción: una conversación creada sin su mensaje, o un
  // mensaje colgando de nada, es peor que no haber guardado.
  await prisma.$transaction(async (tx) => {
    let conv = await tx.conversation.findUnique({
      where: { channelId_externalId: { channelId: m.channelId, externalId: m.de } },
      select: { id: true, personId: true },
    });

    if (!conv) {
      // Se busca por teléfono antes de crear: quien ya es paciente y escribe
      // por primera vez no debe aparecer como desconocido.
      const persona =
        (await tx.person.findFirst({
          where: { phone: telefono, deletedAt: null, mergedIntoId: null },
          select: { id: true },
        })) ??
        (await tx.person.create({
          data: {
            firstName: m.nombre?.split(' ')[0] ?? 'Contacto',
            displayName: m.nombre ?? telefono,
            phone: telefono,
            tags: ['whatsapp'],
          },
          select: { id: true },
        }));

      const canal = await tx.channel.findUniqueOrThrow({
        where: { id: m.channelId },
        select: { siteId: true },
      });

      conv = await tx.conversation.create({
        data: {
          channelId: m.channelId,
          externalId: m.de,
          personId: persona.id,
          siteId: canal.siteId,
          contactName: m.nombre,
          phoneNumber: telefono,
        },
        select: { id: true, personId: true },
      });

      // El primer contacto abre el recorrido del paciente. Es el evento que
      // hace que la ficha empiece por "escribió por WhatsApp" y no por la
      // primera cita, que es lo que la clínica quiere poder ver entero.
      await tx.patientEvent.create({
        data: {
          personId: persona.id,
          type: 'PRIMER_CONTACTO',
          title: `Escribió por WhatsApp desde ${telefono}`,
          siteId: canal.siteId,
          refType: 'conversation',
          refId: conv.id,
          occurredAt: m.recibidoEn,
        },
      });
    }

    // El id externo es único: si Baileys reemite el mismo mensaje tras
    // reconectar, esto lo descarta en vez de duplicarlo en el chat.
    const yaEstaba = await tx.message.findUnique({
      where: { externalId: m.externalId },
      select: { id: true },
    });
    if (yaEstaba) return;

    await tx.message.create({
      data: {
        conversationId: conv.id,
        externalId: m.externalId,
        direction: 'ENTRANTE',
        author: 'PACIENTE',
        type: m.tipo as 'TEXT',
        status: 'ENTREGADO',
        body: m.texto,
        sentAt: m.recibidoEn,
      },
    });

    await tx.conversation.update({
      where: { id: conv.id },
      data: {
        lastMessageAt: m.recibidoEn,
        lastMessageText: m.texto?.slice(0, 200) ?? `[${m.tipo.toLowerCase()}]`,
        unreadCount: { increment: 1 },
        status: 'ABIERTA',
        ...(m.nombre ? { contactName: m.nombre } : {}),
      },
    });
  });

  // Fuera de la transaccion a proposito: si el mensaje se guardo, ya no se
  // pierde. Que ademas confirme una cita es un extra, y un fallo aqui no
  // puede deshacer el guardado del mensaje del paciente.
  const respuesta = interpretar(m.texto);
  if (respuesta) {
    const conv = await prisma.conversation.findUnique({
      where: { channelId_externalId: { channelId: m.channelId, externalId: m.de } },
      select: { personId: true },
    });
    if (conv?.personId) {
      const aplicada = await aplicarRespuesta(prisma, conv.personId, respuesta).catch(() => false);
      if (!aplicada) {
        // Ni una sola cita candidata, o mas de una: no se adivina. El
        // mensaje ya esta en el inbox para que lo lea alguien.
        console.log(`[entrada] "${m.texto}" no se pudo asociar a una cita unica`);
      }
    }
  }
}
