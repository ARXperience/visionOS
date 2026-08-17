import { Controller, Get, Query } from '@nestjs/common';

import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { AutomationsService } from './automations.service';

@Controller('automatizaciones')
export class AutomationsController {
  constructor(private readonly automatizaciones: AutomationsService) {}

  @Get()
  @RequirePermission('dashboard.read')
  estado() {
    return this.automatizaciones.estado();
  }

  @Get('envios')
  @RequirePermission('appointment.read')
  envios(@Query('limite') limite?: string) {
    return this.automatizaciones.ultimos(Math.min(Number(limite) || 50, 200));
  }
}
