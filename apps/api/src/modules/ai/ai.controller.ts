import { Body, Controller, Get, Post } from '@nestjs/common';
import type { User } from '@prisma/client';
import { IsBoolean, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { AsistenteService } from './asistente.service';
import { HERRAMIENTAS } from './herramientas';

class PublicarPromptDto {
  @IsIn(['atencion', 'clasificacion']) slug!: 'atencion' | 'clasificacion';
  @IsString() @MinLength(50) @MaxLength(20_000) content!: string;
  @IsOptional() @IsString() @MaxLength(300) notes?: string;
  @IsOptional() @IsBoolean() activar?: boolean;
}

@Controller('asistente')
export class AiController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly asistente: AsistenteService,
  ) {}

  @RequirePermission('ai.configure')
  @Get('estado')
  async estado() {
    const desde = new Date();
    desde.setUTCDate(1);
    desde.setUTCHours(0, 0, 0, 0);

    const [gasto, corridas, escalados, prompts] = await Promise.all([
      this.prisma.aiRun.aggregate({ where: { createdAt: { gte: desde } }, _sum: { costoUsd: true } }),
      this.prisma.aiRun.count({ where: { createdAt: { gte: desde } } }),
      this.prisma.aiRun.count({ where: { createdAt: { gte: desde }, escaladoMotivo: { not: null } } }),
      this.prisma.aiPrompt.findMany({
        orderBy: [{ slug: 'asc' }, { version: 'desc' }],
        select: { id: true, slug: true, version: true, isActive: true, notes: true, createdAt: true },
      }),
    ]);

    return {
      habilitado: this.asistente.habilitado,
      modo: process.env.AI_MODO ?? 'COPILOTO',
      // El paso a autonomo se mide, no se decide: menos del 60% de
      // sugerencias enviadas sin editar y no se activa.
      criterioAutonomo: 'sugerencias enviadas sin editar >= 60% sobre 100 conversaciones',
      gastoMesUsd: Number(gasto._sum.costoUsd ?? 0),
      presupuestoUsd: Number(process.env.AI_MONTHLY_BUDGET_USD ?? 60),
      corridasMes: corridas,
      escaladosMes: escalados,
      herramientas: HERRAMIENTAS.map((h) => h.nombre),
      prompts,
    };
  }

  /**
   * Publica una version nueva. Nunca edita la anterior: `ai_runs` apunta a la
   * version que produjo cada respuesta, y reescribirla dejaria la
   * trazabilidad mintiendo justo cuando hace falta.
   */
  @RequirePermission('ai.configure')
  @Post('prompts')
  async publicar(@Body() dto: PublicarPromptDto, @CurrentUser() user: User) {
    const ultima = await this.prisma.aiPrompt.findFirst({
      where: { slug: dto.slug },
      orderBy: { version: 'desc' },
      select: { version: true },
    });

    return this.prisma.$transaction(async (tx) => {
      if (dto.activar) {
        await tx.aiPrompt.updateMany({ where: { slug: dto.slug, isActive: true }, data: { isActive: false } });
      }
      return tx.aiPrompt.create({
        data: {
          slug: dto.slug,
          version: (ultima?.version ?? 0) + 1,
          content: dto.content,
          notes: dto.notes,
          isActive: dto.activar ?? false,
          createdById: user.id,
        },
        select: { id: true, slug: true, version: true, isActive: true },
      });
    });
  }

  /** Volver atras en un minuto: activar una version anterior. */
  @RequirePermission('ai.configure')
  @Post('prompts/activar')
  async activar(@Body() dto: { id: string }, @CurrentUser() _user: User) {
    const p = await this.prisma.aiPrompt.findUniqueOrThrow({
      where: { id: dto.id },
      select: { slug: true },
    });
    return this.prisma.$transaction(async (tx) => {
      await tx.aiPrompt.updateMany({ where: { slug: p.slug, isActive: true }, data: { isActive: false } });
      return tx.aiPrompt.update({
        where: { id: dto.id },
        data: { isActive: true },
        select: { id: true, slug: true, version: true, isActive: true },
      });
    });
  }
}
