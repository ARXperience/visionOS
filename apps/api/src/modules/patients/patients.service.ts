import { Injectable, NotFoundException } from '@nestjs/common';
import type { User } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { TimelineService } from '../timeline/timeline.service';

@Injectable()
export class PatientsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly timeline: TimelineService,
  ) {}

  /**
   * La ficha completa: quién es, con quién está cubierto, sus citas, sus
   * conversaciones y su recorrido.
   *
   * El recorrido sale de UNA consulta a `patient_events`, no de un UNION
   * sobre quince tablas. Cuando entren facturación, óptica o cirugía, esos
   * módulos solo insertarán una fila y aparecerán aquí sin tocar esto.
   */
  async ficha(id: string, ctx: { user: User; ip?: string | null; userAgent?: string | null }) {
    const persona = await this.prisma.person.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        displayName: true,
        docType: true,
        docNumber: true,
        birthDate: true,
        sex: true,
        phone: true,
        email: true,
        addressLine: true,
        isPatient: true,
        patientSince: true,
        mrn: true,
        tags: true,
        notes: true,
        mergedIntoId: true,
        coverages: {
          orderBy: { isPrimary: 'desc' },
          select: {
            id: true,
            regime: true,
            planName: true,
            isPrimary: true,
            payer: { select: { name: true, type: true } },
          },
        },
        appointments: {
          orderBy: { startsAt: 'desc' },
          take: 50,
          select: {
            id: true,
            publicCode: true,
            status: true,
            startsAt: true,
            service: { select: { name: true } },
            site: { select: { code: true } },
          },
        },
        conversations: {
          orderBy: { lastMessageAt: 'desc' },
          take: 10,
          select: {
            id: true,
            phoneNumber: true,
            lastMessageAt: true,
            lastMessageText: true,
            status: true,
          },
        },
        consents: {
          orderBy: { grantedAt: 'desc' },
          select: {
            purpose: true,
            granted: true,
            grantedAt: true,
            revokedAt: true,
            policyVersion: true,
          },
        },
      },
    });

    if (!persona) throw new NotFoundException('Paciente no encontrado');

    // Abrir una ficha es leer datos de salud: queda registrado siempre.
    await this.audit.readOf(persona.id, {
      userId: ctx.user.id,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    });

    return { ...persona, recorrido: await this.timeline.recorrido(persona.id) };
  }
}
