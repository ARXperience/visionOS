import { Controller, Get, Query } from '@nestjs/common';
import type { User } from '@prisma/client';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { PrismaService } from '../../prisma/prisma.service';

@Controller('tablero')
export class DashboardController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * El día de hoy en una sola respuesta.
   *
   * Cifras reales o nada: si un módulo no existe todavía, su campo no
   * aparece en vez de venir en cero. Cero citas y "no hay agenda" se ven
   * iguales en pantalla y significan cosas opuestas.
   */
  @RequirePermission('dashboard.read')
  @Get()
  async hoy(@CurrentUser() user: User, @Query('siteId') siteId?: string) {
    const inicio = new Date();
    inicio.setUTCHours(5, 0, 0, 0); // 00:00 en Bogotá
    const fin = new Date(inicio.getTime() + 24 * 3600_000);

    // Sin permiso de ver todas las sedes, solo las suyas.
    const sedes = user.crossSitePatientRead || user.role === 'SUPERADMIN'
      ? null
      : (await this.prisma.userSiteAccess.findMany({
          where: { userId: user.id },
          select: { siteId: true },
        })).map((a) => a.siteId);

    const dondeSede = siteId ? { siteId } : sedes ? { siteId: { in: sedes } } : {};
    const hoy = { startsAt: { gte: inicio, lt: fin }, ...dondeSede };

    const [porEstado, porSede, sinResponder, leadsNuevos, canales, mesPasado] = await Promise.all([
      this.prisma.appointment.groupBy({ by: ['status'], where: hoy, _count: true }),

      this.prisma.appointment.groupBy({
        by: ['siteId'],
        where: hoy,
        _count: true,
      }),

      // Conversaciones sin responder hace más de 15 minutos: es el número
      // que mide si el inbox se está atendiendo o solo se está mirando.
      this.prisma.conversation.count({
        where: {
          deletedAt: null,
          status: 'ABIERTA',
          unreadCount: { gt: 0 },
          lastMessageAt: { lt: new Date(Date.now() - 15 * 60_000) },
        },
      }),

      this.prisma.lead.count({ where: { status: 'NUEVO' } }),

      this.prisma.channel.findMany({
        select: { id: true, name: true, status: true, lastError: true },
      }),

      // No-show del mes anterior, para poder comparar cuando entren los
      // recordatorios. Sin la línea base, "bajó" no significa nada.
      this.prisma.appointment.groupBy({
        by: ['status'],
        where: {
          startsAt: {
            gte: new Date(inicio.getFullYear(), inicio.getMonth() - 1, 1),
            lt: new Date(inicio.getFullYear(), inicio.getMonth(), 1),
          },
          status: { in: ['FINALIZADA', 'NO_ASISTIO'] },
        },
        _count: true,
      }),
    ]);

    const cuenta = (estados: string[]) =>
      porEstado.filter((p) => estados.includes(p.status)).reduce((s, p) => s + p._count, 0);

    const atendidas = mesPasado.find((m) => m.status === 'FINALIZADA')?._count ?? 0;
    const ausentes = mesPasado.find((m) => m.status === 'NO_ASISTIO')?._count ?? 0;

    const nombres = await this.prisma.site.findMany({ select: { id: true, code: true } });

    return {
      citas: {
        total: porEstado.reduce((s, p) => s + p._count, 0),
        confirmadas: cuenta(['CONFIRMADA']),
        sinConfirmar: cuenta(['PROGRAMADA']),
        enSala: cuenta(['LLEGO', 'EN_ADMISION', 'EN_ESPERA']),
        atendiendo: cuenta(['EN_ATENCION', 'EN_PROCEDIMIENTO']),
        finalizadas: cuenta(['FINALIZADA']),
        noAsistio: cuenta(['NO_ASISTIO']),
        canceladas: cuenta(['CANCELADA']),
      },
      porSede: porSede.map((p) => ({
        code: nombres.find((n) => n.id === p.siteId)?.code ?? '—',
        citas: p._count,
      })),
      conversacionesSinResponder: sinResponder,
      leadsNuevos,
      canales,
      // Línea base para medir si los recordatorios sirven de algo.
      noShowMesAnterior:
        atendidas + ausentes > 0 ? Math.round((ausentes / (atendidas + ausentes)) * 100) : null,
    };
  }
}
