import { Injectable, Logger } from '@nestjs/common';
import type { AuditAction, Prisma } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

export interface AuditEntry {
  userId?: string | null;
  action: AuditAction;
  entityType: string;
  entityId?: string | null;
  /** Paciente afectado. Desnormalizado para poder responder "quién vio a quién". */
  personId?: string | null;
  siteId?: string | null;
  oldValues?: Prisma.InputJsonValue;
  newValues?: Prisma.InputJsonValue;
  ipAddress?: string | null;
  userAgent?: string | null;
  requestId?: string | null;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Registra y nunca revienta la operación que lo invoca: una auditoría que
   * falla no debe impedir que un paciente sea atendido. Pero sí deja rastro
   * en el log del servidor, porque perder auditoría en silencio es peor.
   */
  async record(entry: AuditEntry): Promise<void> {
    try {
      await this.prisma.auditLog.create({ data: entry });
    } catch (e) {
      this.logger.error(
        `No se pudo auditar ${entry.action} sobre ${entry.entityType}: ${(e as Error).message}`,
      );
    }
  }

  /**
   * Lectura de datos de un paciente. La Ley 1581 obliga a poder responder
   * quién consultó una ficha, no solo quién la modificó, así que las consultas
   * también se registran — incluidas las que devuelven listados.
   */
  readOf(
    personId: string,
    ctx: { userId?: string | null; siteId?: string | null; ip?: string | null; userAgent?: string | null },
  ): Promise<void> {
    return this.record({
      userId: ctx.userId,
      action: 'READ',
      entityType: 'person',
      entityId: personId,
      personId,
      siteId: ctx.siteId,
      ipAddress: ctx.ip,
      userAgent: ctx.userAgent,
    });
  }
}
