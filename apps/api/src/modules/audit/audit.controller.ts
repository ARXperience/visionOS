import { Controller, Get, Query, Req } from '@nestjs/common';
import type { AuditAction, Prisma, User } from '@prisma/client';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from './audit.service';

const ACCIONES = [
  'CREATE', 'UPDATE', 'DELETE', 'READ', 'EXPORT',
  'LOGIN', 'LOGIN_FAILED', 'LOGOUT', 'PRINT', 'SHARE', 'MERGE',
] as const;

/** Tope por página. Sin él, un rango amplio trae medio millón de filas. */
const POR_PAGINA = 100;

@Controller('auditoria')
export class AuditController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Consulta del registro inmutable.
   *
   * Navegar la auditoría NO se audita a su vez: produciría ruido infinito y
   * cada consulta generaría la fila que la siguiente consulta encuentra.
   * Lo que sí se registra es la EXPORTACIÓN — que es la acción con la que
   * los datos salen del sistema, y la que de verdad hay que poder rastrear.
   */
  @RequirePermission('audit.read')
  @Get()
  async listar(
    @Query('accion') accion?: string,
    @Query('personId') personId?: string,
    @Query('userId') userId?: string,
    @Query('entidad') entidad?: string,
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
    @Query('pagina') pagina = '0',
  ) {
    const donde: Prisma.AuditLogWhereInput = {
      ...(accion && ACCIONES.includes(accion as never) ? { action: accion as AuditAction } : {}),
      ...(personId ? { personId } : {}),
      ...(userId ? { userId } : {}),
      ...(entidad ? { entityType: entidad } : {}),
      ...(desde || hasta
        ? {
            createdAt: {
              ...(desde ? { gte: new Date(`${desde}T00:00:00.000Z`) } : {}),
              ...(hasta ? { lte: new Date(`${hasta}T23:59:59.999Z`) } : {}),
            },
          }
        : {}),
    };

    const salto = Math.max(0, Number(pagina) || 0) * POR_PAGINA;

    const [total, filas] = await Promise.all([
      this.prisma.auditLog.count({ where: donde }),
      this.prisma.auditLog.findMany({
        where: donde,
        orderBy: { createdAt: 'desc' },
        skip: salto,
        take: POR_PAGINA,
        select: {
          id: true,
          action: true,
          entityType: true,
          entityId: true,
          personId: true,
          ipAddress: true,
          oldValues: true,
          newValues: true,
          createdAt: true,
          user: { select: { firstName: true, lastName: true, email: true } },
          person: { select: { displayName: true } },
        },
      }),
    ]);

    return { total, pagina: Number(pagina) || 0, porPagina: POR_PAGINA, filas };
  }

  /**
   * Quién ha consultado la ficha de un paciente.
   *
   * Es la pregunta concreta que la Ley 1581 obliga a poder responder, y el
   * motivo por el que `personId` está desnormalizado en la tabla: sin él,
   * responderla exigiría recorrer todos los registros y adivinar.
   */
  @RequirePermission('audit.read')
  @Get('paciente')
  quienVio(@Query('personId') personId: string) {
    return this.prisma.auditLog.findMany({
      where: { personId, action: { in: ['READ', 'EXPORT', 'PRINT', 'SHARE'] } },
      orderBy: { createdAt: 'desc' },
      take: 200,
      select: {
        id: true,
        action: true,
        ipAddress: true,
        createdAt: true,
        user: { select: { firstName: true, lastName: true, email: true } },
      },
    });
  }

  /** Resumen para el tablero: qué se ha hecho hoy y quién falló al entrar. */
  @RequirePermission('audit.read')
  @Get('resumen')
  async resumen() {
    const hoy = new Date();
    hoy.setUTCHours(0, 0, 0, 0);

    const [porAccion, fallidos, lecturasFicha, busquedas] = await Promise.all([
      this.prisma.auditLog.groupBy({
        by: ['action'],
        where: { createdAt: { gte: hoy } },
        _count: true,
      }),
      this.prisma.auditLog.findMany({
        where: { action: 'LOGIN_FAILED', createdAt: { gte: hoy } },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: { ipAddress: true, newValues: true, createdAt: true },
      }),
      // Solo las lecturas de UNA ficha concreta. Una busqueda tambien deja
      // un READ sobre `person`, pero sin personId: contarlas juntas infla la
      // cifra y hace parecer que se abrieron historias que nadie abrio.
      this.prisma.auditLog.count({
        where: {
          action: 'READ',
          entityType: 'person',
          personId: { not: null },
          createdAt: { gte: hoy },
        },
      }),
      this.prisma.auditLog.count({
        where: {
          action: 'READ',
          entityType: 'person',
          personId: null,
          createdAt: { gte: hoy },
        },
      }),
    ]);

    return {
      hoy: Object.fromEntries(porAccion.map((p) => [p.action, p._count])),
      // Varios fallos desde la misma IP son la señal que hay que mirar.
      loginsFallidos: fallidos,
      lecturasDeFichaHoy: lecturasFicha,
      busquedasDePacienteHoy: busquedas,
    };
  }

  /**
   * Exportación en CSV. ESTA sí se audita: es la acción con la que los datos
   * salen del sistema.
   */
  @RequirePermission('audit.read')
  @Get('exportar')
  async exportar(
    @CurrentUser() user: User,
    @Req() req: { ip?: string },
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
  ) {
    const filas = await this.prisma.auditLog.findMany({
      where:
        desde || hasta
          ? {
              createdAt: {
                ...(desde ? { gte: new Date(`${desde}T00:00:00.000Z`) } : {}),
                ...(hasta ? { lte: new Date(`${hasta}T23:59:59.999Z`) } : {}),
              },
            }
          : {},
      orderBy: { createdAt: 'desc' },
      take: 10_000,
      select: {
        createdAt: true,
        action: true,
        entityType: true,
        entityId: true,
        ipAddress: true,
        user: { select: { email: true } },
        person: { select: { displayName: true } },
      },
    });

    await this.audit.record({
      userId: user.id,
      action: 'EXPORT',
      entityType: 'audit_log',
      newValues: { filas: filas.length, desde, hasta },
      ipAddress: req.ip ?? null,
    });

    const escapar = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csv = [
      'fecha,accion,entidad,entidad_id,usuario,paciente,ip',
      ...filas.map((f) =>
        [
          f.createdAt.toISOString(),
          f.action,
          f.entityType,
          f.entityId,
          f.user?.email,
          f.person?.displayName,
          f.ipAddress,
        ]
          .map(escapar)
          .join(','),
      ),
    ].join('\n');

    return { csv, filas: filas.length };
  }
}
