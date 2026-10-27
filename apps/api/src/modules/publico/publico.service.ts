import { BadRequestException, Injectable, Logger } from '@nestjs/common';

import { aE164Colombia } from '../../common/utils/telefono.util';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { TimelineService } from '../timeline/timeline.service';

/**
 * Versión de la política de privacidad que el paciente acepta al enviar el
 * formulario. Va aquí y no en el HTML: la evidencia del consentimiento la
 * guarda quien va a tener que mostrarla. Subirla cuando cambie la política
 * publicada.
 */
const POLITICA = '2026-01';

/** Un lead abierto de esta semana no se duplica: se enriquece. */
const VENTANA_MS = 7 * 86_400_000;

export interface Solicitud {
  nombre: string;
  telefono: string;
  correo?: string;
  sede?: string;
  servicio?: string;
  mensaje?: string;
}

/**
 * La puerta del sitio público al ecosistema.
 *
 * Todo lo de aquí sale a internet SIN sesión, así que hace solo dos cosas:
 * publica lo que la clínica ya publica en su folleto —sedes y servicios— y
 * recibe. Nunca devuelve datos de una persona: para eso está el portal, que
 * exige el código de la cita más el documento.
 *
 * El formulario no crea una cita. Crea un Lead, que es lo que el mostrador
 * puede trabajar y lo que el embudo mide. Una cita que nadie confirmó contra
 * la agenda real es un cupo vendido dos veces.
 */
@Injectable()
export class PublicoService {
  private readonly log = new Logger('Publico');

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly timeline: TimelineService,
  ) {}

  sedes() {
    return this.prisma.site.findMany({
      where: { isActive: true },
      orderBy: { code: 'asc' },
      select: { code: true, name: true, city: true, address: true, phone: true, openingHours: true },
    });
  }

  /**
   * Solo lo agendable en línea. Un servicio que existe en el catálogo pero
   * que exige valoración previa no debe salir en un desplegable donde el
   * paciente cree que lo está pidiendo.
   */
  async servicios() {
    const filas = await this.prisma.service.findMany({
      where: { isActive: true, isSchedulableOnline: true },
      orderBy: [{ businessLine: 'asc' }, { name: 'asc' }],
      select: {
        slug: true,
        name: true,
        businessLine: true,
        durationMin: true,
        requiresReferral: true,
        requiresAuthorization: true,
        requiresDilation: true,
        requiresCompanion: true,
      },
    });

    const lineas = new Map<string, typeof filas>();
    for (const f of filas) {
      const previas = lineas.get(f.businessLine) ?? [];
      previas.push(f);
      lineas.set(f.businessLine, previas);
    }

    return [...lineas.entries()].map(([linea, servicios]) => ({ linea, servicios }));
  }

  async solicitar(datos: Solicitud, ip: string | null, userAgent: string | null) {
    const telefono = aE164Colombia(datos.telefono);
    if (!telefono) {
      throw new BadRequestException(
        'Revise el teléfono: escriba los diez dígitos, por ejemplo 310 514 9719.',
      );
    }

    const nombre = datos.nombre.trim().replace(/\s+/g, ' ');
    const partes = nombre.split(' ');
    const correo = datos.correo?.trim().toLowerCase() || null;

    const [sede, servicio] = await Promise.all([
      datos.sede
        ? this.prisma.site.findFirst({
            where: { code: datos.sede, isActive: true },
            select: { id: true, name: true },
          })
        : null,
      datos.servicio
        ? this.prisma.service.findFirst({
            where: { slug: datos.servicio, isActive: true },
            select: { id: true, name: true },
          })
        : null,
    ]);

    const interes = [servicio?.name ?? 'Sin definir', datos.mensaje?.trim()]
      .filter(Boolean)
      .join(' — ')
      .slice(0, 1000);

    const { lead, personId, nuevaPersona } = await this.prisma.$transaction(async (tx) => {
      // Buscar antes de crear, por teléfono normalizado: quien ya escribió
      // por WhatsApp es la MISMA persona, no un contacto nuevo.
      const existente = await tx.person.findFirst({
        where: { phone: telefono, deletedAt: null, mergedIntoId: null },
        select: { id: true, email: true },
      });

      const persona =
        existente ??
        (await tx.person.create({
          data: {
            firstName: partes[0],
            firstSurname: partes.slice(1).join(' ') || null,
            displayName: nombre,
            phone: telefono,
            email: correo,
            tags: ['web'],
          },
          select: { id: true, email: true },
        }));

      // Completar sin pisar: el correo que ya estaba puede venir de la ficha
      // firmada en el mostrador y valer más que el que se escribe con prisa.
      if (correo && !persona.email) {
        await tx.person.update({ where: { id: persona.id }, data: { email: correo } });
      }

      // La casilla de la Ley 1581 no es decorativa: sin evidencia con fecha,
      // IP y versión de la política, la clínica no puede demostrar que tenía
      // permiso para llamar a esa persona.
      await tx.dataConsent.create({
        data: {
          personId: persona.id,
          purpose: 'TRATAMIENTO_DATOS',
          granted: true,
          policyVersion: POLITICA,
          channel: 'web',
          evidenceText: 'Casilla de autorización marcada en el formulario del sitio público.',
          ipAddress: ip,
        },
      });

      if (!existente) {
        await this.timeline.emitir(
          {
            personId: persona.id,
            type: 'PRIMER_CONTACTO',
            title: 'Dejó sus datos en el sitio web',
            siteId: sede?.id ?? null,
          },
          tx,
        );
      }

      // Enviar el formulario dos veces —porque no llegó respuesta— no puede
      // producir dos leads: el mostrador vería trabajo duplicado y el embudo
      // contaría dos oportunidades donde hay una.
      const abierto = await tx.lead.findFirst({
        where: {
          personId: persona.id,
          status: { notIn: ['PERDIDO', 'CONVERTIDO'] },
          createdAt: { gt: new Date(Date.now() - VENTANA_MS) },
        },
        orderBy: { createdAt: 'desc' },
        select: { id: true },
      });

      if (abierto) {
        const l = await tx.lead.update({
          where: { id: abierto.id },
          data: {
            interestText: interes,
            ...(servicio ? { interestServiceId: servicio.id } : {}),
            ...(sede ? { siteId: sede.id } : {}),
          },
          select: { id: true },
        });
        return { lead: l, personId: persona.id, nuevaPersona: !existente };
      }

      const l = await tx.lead.create({
        data: {
          personId: persona.id,
          status: 'NUEVO',
          source: 'WEB',
          siteId: sede?.id ?? null,
          interestServiceId: servicio?.id ?? null,
          interestText: interes,
          metadata: { userAgent: userAgent?.slice(0, 200) ?? null },
        },
        select: { id: true },
      });

      await this.timeline.emitir(
        {
          personId: persona.id,
          type: 'LEAD_CREADO',
          title: `Solicitud desde el sitio web: ${servicio?.name ?? 'sin definir'}`,
          siteId: sede?.id ?? null,
          refType: 'lead',
          refId: l.id,
        },
        tx,
      );

      return { lead: l, personId: persona.id, nuevaPersona: !existente };
    });

    await this.audit.record({
      action: 'CREATE',
      entityType: 'lead',
      entityId: lead.id,
      personId,
      newValues: { origen: 'sitio web', servicio: servicio?.name ?? null, sede: sede?.name ?? null },
      ipAddress: ip,
      userAgent,
    });

    this.log.log(
      `Solicitud web ${nuevaPersona ? '(persona nueva)' : '(persona conocida)'} -> lead ${lead.id}`,
    );

    return {
      // Con esto el paciente puede decir por WhatsApp "radiqué la VC-3F2A9" y
      // el mostrador encuentra la solicitud sin pedirle los datos otra vez.
      radicado: `VC-${lead.id.replace(/-/g, '').slice(0, 5).toUpperCase()}`,
      mensaje:
        'Recibimos su solicitud. Un asesor se comunica con usted en horario hábil para confirmar día, hora y sede.',
    };
  }
}
