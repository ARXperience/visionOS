import { Body, Controller, Get, Post, Query, Req } from '@nestjs/common';
import type { User } from '@prisma/client';
import { IsNumber, IsOptional, IsString, IsUUID, Matches, MaxLength, Min } from 'class-validator';
import type { Request } from 'express';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { TreasuryService } from './treasury.service';

class CerrarDto {
  @IsUUID() siteId!: string;
  /** Día de calendario, no instante: AAAA-MM-DD. */
  @Matches(/^\d{4}-\d{2}-\d{2}$/) fecha!: string;
  @IsNumber() @Min(0) countedCash!: number;
  @IsOptional() @IsNumber() @Min(0) openingFloat?: number;
  @IsOptional() @IsString() @MaxLength(500) notes?: string;
}

@Controller('tesoreria')
export class TreasuryController {
  constructor(private readonly tesoreria: TreasuryService) {}

  /** Lo que el sistema espera encontrar en caja. */
  @Get('esperado')
  @RequirePermission('dashboard.read')
  esperado(@Query('siteId') siteId: string, @Query('fecha') fecha?: string) {
    return this.tesoreria.esperado(siteId, fecha ?? new Date().toISOString().slice(0, 10));
  }

  @Get('cierres')
  @RequirePermission('dashboard.read')
  historico(@Query('siteId') siteId?: string, @Query('dias') dias?: string) {
    return this.tesoreria.historico(siteId, Math.min(Number(dias) || 30, 365));
  }

  /** Días con dinero recibido que nadie cerró. */
  @Get('sin-cerrar')
  @RequirePermission('dashboard.read')
  sinCerrar(@Query('siteId') siteId?: string) {
    return this.tesoreria.sinCerrar(siteId);
  }

  @Post('cierres')
  @RequirePermission('settings.manage')
  cerrar(@Body() dto: CerrarDto, @CurrentUser() user: User, @Req() req: Request) {
    return this.tesoreria.cerrar(dto, { actor: user, ip: req.ip });
  }
}
