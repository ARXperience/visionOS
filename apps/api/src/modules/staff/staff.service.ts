import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { CredentialKind, User } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { StorageService } from '../storage/storage.service';

interface Ctx {
  actor: User;
  ip?: string | null;
}

/**
 * Credenciales del personal.
 *
 * Es el único pedazo de talento humano que se construye. Nómina, contratación
 * y desempeño se compran; vacaciones y ausencias ya son bloqueos de
 * ResourceBooking, que es lo que de verdad importa —que no se le pueda
 * agendar un paciente a alguien que no está.
 *
 * Lo que no vende nadie es esto: saber, antes de la visita de habilitación,
 * quién está atendiendo con la póliza vencida.
 */
@Injectable()
export class StaffService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly storage: StorageService,
  ) {}

  async registrar(
    datos: {
      professionalId: string;
      kind: CredentialKind;
      number?: string;
      issuedBy?: string;
      issuedAt?: Date;
      expiresAt?: Date;
      fileUrl?: string;
      notes?: string;
    },
    ctx: Ctx,
  ) {
    if (datos.issuedAt && datos.expiresAt && datos.expiresAt <= datos.issuedAt) {
      throw new BadRequestException('La fecha de vencimiento es anterior a la de expedición.');
    }

    const c = await this.prisma.staffCredential.create({
      data: { ...datos, createdById: ctx.actor.id },
      select: { id: true, kind: true, expiresAt: true },
    });

    await this.audit.record({
      userId: ctx.actor.id,
      action: 'CREATE',
      entityType: 'staff_credential',
      entityId: c.id,
      newValues: { profesional: datos.professionalId, tipo: datos.kind, vence: datos.expiresAt },
      ipAddress: ctx.ip,
    });

    return c;
  }

  async eliminar(id: string, ctx: Ctx) {
    const c = await this.prisma.staffCredential.findUnique({
      where: { id },
      select: { professionalId: true, kind: true },
    });
    if (!c) throw new NotFoundException('Credencial no encontrada');

    await this.prisma.staffCredential.delete({ where: { id } });
    await this.audit.record({
      userId: ctx.actor.id,
      action: 'DELETE',
      entityType: 'staff_credential',
      entityId: id,
      oldValues: { profesional: c.professionalId, tipo: c.kind },
      ipAddress: ctx.ip,
    });

    return { ok: true };
  }

  async deProfesional(professionalId: string) {
    const credenciales = await this.prisma.staffCredential.findMany({
      where: { professionalId },
      orderBy: [{ expiresAt: 'asc' }],
      select: {
        id: true,
        kind: true,
        number: true,
        issuedBy: true,
        issuedAt: true,
        expiresAt: true,
        fileUrl: true,
        notes: true,
      },
    });

    // El enlace se firma al pedirlo y dura cinco minutos, igual que los
    // resultados: no se guarda ninguna URL pública.
    return Promise.all(
      credenciales.map(async (c) => ({
        ...c,
        enlace:
          c.fileUrl && this.storage.habilitado
            ? (await this.storage.firmarDescarga(c.fileUrl)).url
            : null,
        diasParaVencer: c.expiresAt
          ? Math.floor((c.expiresAt.getTime() - Date.now()) / 86_400_000)
          : null,
      })),
    );
  }

  /**
   * Lo que hay que mirar antes de una visita de habilitación.
   *
   * Devuelve tres cosas y no una lista: lo vencido, lo que vence pronto y
   * —la más importante— quién está activo y NO tiene una credencial que
   * debería tener. Un documento que falta no aparece en ninguna lista de
   * documentos, y por eso nadie lo echa de menos.
   */
  async alertas() {
    const en60 = new Date();
    en60.setUTCDate(en60.getUTCDate() + 60);
    const hoy = new Date();

    const profesionales = await this.prisma.professional.findMany({
      where: { isActive: true },
      select: {
        id: true,
        displayName: true,
        type: true,
        licenseNumber: true,
        credentials: { select: { id: true, kind: true, expiresAt: true, number: true } },
      },
    });

    const vencidas: { profesional: string; tipo: string; vencio: string }[] = [];
    const porVencer: { profesional: string; tipo: string; vence: string; dias: number }[] = [];
    const faltantes: { profesional: string; falta: string[] }[] = [];

    // Lo que cualquier profesional que atiende pacientes debe tener al día.
    const EXIGIDAS: CredentialKind[] = ['TARJETA_PROFESIONAL', 'RETHUS', 'POLIZA_RESPONSABILIDAD'];

    for (const p of profesionales) {
      for (const c of p.credentials) {
        if (!c.expiresAt) continue;
        if (c.expiresAt < hoy) {
          vencidas.push({
            profesional: p.displayName,
            tipo: c.kind,
            vencio: c.expiresAt.toISOString().slice(0, 10),
          });
        } else if (c.expiresAt <= en60) {
          porVencer.push({
            profesional: p.displayName,
            tipo: c.kind,
            vence: c.expiresAt.toISOString().slice(0, 10),
            dias: Math.floor((c.expiresAt.getTime() - hoy.getTime()) / 86_400_000),
          });
        }
      }

      const tiene = new Set(p.credentials.map((c) => c.kind));
      const falta = EXIGIDAS.filter((k) => !tiene.has(k));
      if (falta.length) faltantes.push({ profesional: p.displayName, falta });
    }

    porVencer.sort((a, b) => a.dias - b.dias);

    return {
      vencidas,
      porVencer,
      sinRegistrar: faltantes,
      profesionalesActivos: profesionales.length,
    };
  }
}
