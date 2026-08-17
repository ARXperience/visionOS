import { Controller, Get, Query } from '@nestjs/common';

import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { IndicatorsService } from './indicators.service';

@Controller('indicadores')
export class IndicatorsController {
  constructor(private readonly indicadores: IndicatorsService) {}

  @Get()
  @RequirePermission('dashboard.read')
  mensual(
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
    @Query('siteId') siteId?: string,
  ) {
    // Por defecto, el mes en curso: es lo que alguien quiere ver al entrar.
    const hoy = new Date();
    const d = desde ? new Date(desde) : new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), 1));
    const h = hasta ? new Date(hasta) : hoy;
    return this.indicadores.mensual(d, h, siteId);
  }

  /** Una foto no dice si algo mejora. */
  @Get('tendencia')
  @RequirePermission('dashboard.read')
  tendencia(@Query('meses') meses?: string, @Query('siteId') siteId?: string) {
    return this.indicadores.tendencia(Math.min(Number(meses) || 6, 24), siteId);
  }
}
