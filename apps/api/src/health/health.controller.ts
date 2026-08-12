import { Controller, Get } from '@nestjs/common';

import { Public } from '../common/decorators/public.decorator';
import { PrismaService } from '../prisma/prisma.service';

/**
 * El SHA no es decoracion: es el criterio de verificacion de E0.
 *
 * En el ERP de Servimil "el panel dice completado" no significa que el
 * cambio entro — hay que commitear el dist a mano y a veces no llega.
 * Aqui el despliegue se comprueba contrastando este valor con el commit
 * que se acaba de subir, sin abrir ningun panel.
 */
@Controller('health')
export class HealthController {
  private readonly startedAt = new Date();

  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get()
  async check() {
    let database = 'up';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      database = 'down';
    }

    return {
      status: database === 'up' ? 'ok' : 'degraded',
      sha: process.env.GIT_SHA ?? 'unknown',
      env: process.env.NODE_ENV ?? 'development',
      startedAt: this.startedAt.toISOString(),
      database,
    };
  }
}
