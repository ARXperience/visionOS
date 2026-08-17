import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { User } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

interface Ctx {
  actor: User;
  ip?: string | null;
}

/**
 * Jornadas de tamizaje en empresas.
 *
 * Una jornada no se modela como un montón de citas: es un compromiso propio
 * —"vamos el martes con dos optometras y esperamos sesenta personas"— y lo
 * que se mide es cuántos aparecieron de los que dijeron.
 *
 * Cada asistente sí genera su Person, porque un hallazgo en un tamizaje es un
 * paciente al que hay que poder llamar. Una jornada cuyos hallazgos se quedan
 * en una planilla es una jornada regalada.
 */
@Injectable()
export class CampaignsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async crearEmpresa(datos: {
    nit: string;
    name: string;
    contactName?: string;
    contactPhone?: string;
    contactEmail?: string;
    address?: string;
  }) {
    const nit = datos.nit.replace(/[^0-9]/g, '');
    if (nit.length < 5) throw new BadRequestException('El NIT no parece válido.');

    // Quien vuelve a cargar una empresa que ya existe necesita saberlo y
    // encontrarla, no recibir un error del motor de base de datos.
    const existente = await this.prisma.company.findUnique({
      where: { nit },
      select: { id: true, name: true, isActive: true },
    });
    if (existente) {
      throw new ConflictException(
        `Ese NIT ya está registrado como "${existente.name}"${existente.isActive ? '' : ' (inactiva)'}.`,
      );
    }

    return this.prisma.company.create({
      data: { ...datos, nit, name: datos.name.trim() },
      select: { id: true, nit: true, name: true },
    });
  }

  empresas() {
    return this.prisma.company.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        nit: true,
        name: true,
        contactName: true,
        contactPhone: true,
        _count: { select: { campaigns: true } },
      },
    });
  }

  async crear(
    datos: {
      companyId: string;
      siteId?: string;
      name: string;
      scheduledAt: Date;
      location?: string;
      expectedPeople?: number;
      notes?: string;
    },
    ctx: Ctx,
  ) {
    const c = await this.prisma.campaign.create({
      data: { ...datos, name: datos.name.trim(), createdById: ctx.actor.id },
      select: { id: true, name: true, status: true, scheduledAt: true },
    });

    await this.audit.record({
      userId: ctx.actor.id,
      action: 'CREATE',
      entityType: 'campaign',
      entityId: c.id,
      siteId: datos.siteId,
      newValues: { nombre: c.name, empresa: datos.companyId },
      ipAddress: ctx.ip,
    });

    return c;
  }

  async listar(status?: string) {
    const campanas = await this.prisma.campaign.findMany({
      where: status ? { status: status as never } : {},
      orderBy: { scheduledAt: 'desc' },
      take: 100,
      select: {
        id: true,
        name: true,
        status: true,
        scheduledAt: true,
        location: true,
        expectedPeople: true,
        notes: true,
        company: { select: { id: true, name: true, contactName: true, contactPhone: true } },
        site: { select: { code: true } },
        participants: {
          select: {
            id: true,
            finding: true,
            needsFollowUp: true,
            person: {
              select: {
                id: true,
                displayName: true,
                phone: true,
                // Con esto se sabe si el que necesitaba valoración volvió.
                appointments: { select: { id: true, startsAt: true }, take: 1, orderBy: { startsAt: 'desc' } },
              },
            },
          },
        },
      },
    });

    return campanas.map((c) => {
      const atendidos = c.participants.length;
      const conHallazgo = c.participants.filter((p) => p.needsFollowUp);
      const agendados = conHallazgo.filter((p) => p.person.appointments.length > 0).length;

      return {
        ...c,
        atendidos,
        // De los que dijeron que irían, cuántos fueron. Es lo que se negocia
        // con la empresa la próxima vez.
        asistencia: c.expectedPeople ? Number(((atendidos / c.expectedPeople) * 100).toFixed(1)) : null,
        requierenValoracion: conHallazgo.length,
        // El único número que dice si la jornada sirvió de algo.
        yaAgendados: agendados,
        sinAgendar: conHallazgo.length - agendados,
      };
    });
  }

  /**
   * Registra a alguien atendido en la jornada. Crea la persona si no existe:
   * es la razón de ser del tamizaje.
   */
  async registrar(
    campaignId: string,
    datos: {
      documento: string;
      nombre: string;
      apellido?: string;
      telefono?: string;
      finding?: string;
      needsFollowUp?: boolean;
    },
    ctx: Ctx,
  ) {
    const campana = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { id: true, status: true, siteId: true, name: true },
    });
    if (!campana) throw new NotFoundException('Jornada no encontrada');
    if (campana.status === 'CANCELADA') throw new BadRequestException('La jornada está cancelada.');

    const documento = datos.documento.trim();
    const apellido = datos.apellido?.trim() || 'Sin apellido';

    const persona = await this.prisma.person.upsert({
      where: { docType_docNumber: { docType: 'CC', docNumber: documento } },
      create: {
        docType: 'CC',
        docNumber: documento,
        firstName: datos.nombre.trim(),
        firstSurname: apellido,
        displayName: `${datos.nombre.trim()} ${apellido}`.trim(),
        phone: datos.telefono?.trim(),
        // Se marca paciente solo si hay algo que seguir. Un tamizaje normal
        // no convierte a nadie en paciente de la clínica.
        isPatient: Boolean(datos.needsFollowUp),
      },
      update: {
        ...(datos.telefono ? { phone: datos.telefono.trim() } : {}),
        ...(datos.needsFollowUp ? { isPatient: true } : {}),
      },
      select: { id: true, displayName: true },
    });

    const yaEsta = await this.prisma.campaignParticipant.findUnique({
      where: { campaignId_personId: { campaignId, personId: persona.id } },
      select: { id: true },
    });
    if (yaEsta) throw new ConflictException(`${persona.displayName} ya fue registrado en esta jornada.`);

    const p = await this.prisma.campaignParticipant.create({
      data: {
        campaignId,
        personId: persona.id,
        finding: datos.finding?.trim(),
        needsFollowUp: datos.needsFollowUp ?? false,
      },
      select: { id: true, needsFollowUp: true },
    });

    await this.audit.record({
      userId: ctx.actor.id,
      action: 'CREATE',
      entityType: 'campaign_participant',
      entityId: p.id,
      personId: persona.id,
      siteId: campana.siteId,
      newValues: { jornada: campana.name, requiereValoracion: p.needsFollowUp },
      ipAddress: ctx.ip,
    });

    return { ...p, persona };
  }

  async cambiarEstado(id: string, status: 'PLANEADA' | 'CONFIRMADA' | 'EJECUTADA' | 'CANCELADA', ctx: Ctx) {
    const c = await this.prisma.campaign.update({
      where: { id },
      data: { status },
      select: { id: true, status: true, siteId: true },
    });

    await this.audit.record({
      userId: ctx.actor.id,
      action: 'UPDATE',
      entityType: 'campaign',
      entityId: id,
      siteId: c.siteId,
      newValues: { estado: status },
      ipAddress: ctx.ip,
    });

    return c;
  }

  /**
   * A quién hay que llamar: tamizados con hallazgo que nunca agendaron.
   *
   * Es el entregable real de una jornada. Sin esta lista, el tamizaje es una
   * mañana de trabajo que termina en una carpeta.
   */
  async pendientesDeLlamar() {
    const conHallazgo = await this.prisma.campaignParticipant.findMany({
      where: { needsFollowUp: true },
      select: {
        id: true,
        finding: true,
        createdAt: true,
        campaign: { select: { name: true, scheduledAt: true, company: { select: { name: true } } } },
        person: {
          select: {
            id: true,
            displayName: true,
            phone: true,
            appointments: { select: { id: true }, take: 1 },
          },
        },
      },
    });

    const ahora = Date.now();
    return conHallazgo
      .filter((p) => p.person.appointments.length === 0)
      .map((p) => ({
        personId: p.person.id,
        paciente: p.person.displayName,
        telefono: p.person.phone,
        hallazgo: p.finding,
        empresa: p.campaign.company.name,
        jornada: p.campaign.name,
        diasDesde: Math.floor((ahora - p.createdAt.getTime()) / 86_400_000),
      }))
      .sort((a, b) => b.diasDesde - a.diasDesde);
  }
}
