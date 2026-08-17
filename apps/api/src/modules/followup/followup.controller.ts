import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, Req } from '@nestjs/common';
import type { User } from '@prisma/client';
import { IsDateString, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';
import type { Request } from 'express';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { FollowupService } from './followup.service';

class AnotarDto {
  @IsUUID() personId!: string;
  @IsUUID() siteId!: string;
  @IsUUID() serviceId!: string;
  @IsOptional() @IsUUID() professionalId?: string;
  @IsOptional() @IsDateString() preferredFrom?: string;
  @IsOptional() @IsDateString() preferredTo?: string;
  /** 0 normal, 100 prioritario. */
  @IsOptional() @IsInt() @Min(0) @Max(100) priority?: number;
  @IsOptional() @IsString() @MaxLength(500) notes?: string;
}

class RetirarDto {
  @IsOptional() @IsString() @MaxLength(200) motivo?: string;
}

@Controller('seguimiento')
export class FollowupController {
  constructor(private readonly seguimiento: FollowupService) {}

  private ctx(user: User, req: Request) {
    return { actor: user, ip: req.ip };
  }

  @Get('resumen')
  @RequirePermission('appointment.read')
  resumen(@Query('siteId') siteId?: string) {
    return this.seguimiento.resumen(siteId);
  }

  @Get('espera')
  @RequirePermission('appointment.read')
  espera(@Query('siteId') siteId?: string, @Query('serviceId') serviceId?: string) {
    return this.seguimiento.espera({ siteId, serviceId });
  }

  /** Quien fue atendido hace tiempo y no tiene ninguna cita futura. */
  @Get('controles')
  @RequirePermission('appointment.read')
  controles(@Query('meses') meses?: string, @Query('siteId') siteId?: string) {
    return this.seguimiento.controlesPendientes(Math.min(Number(meses) || 12, 60), siteId);
  }

  @Post('espera')
  @RequirePermission('waitlist.manage')
  anotar(@Body() dto: AnotarDto, @CurrentUser() user: User, @Req() req: Request) {
    return this.seguimiento.anotar(
      {
        ...dto,
        preferredFrom: dto.preferredFrom ? new Date(dto.preferredFrom) : undefined,
        preferredTo: dto.preferredTo ? new Date(dto.preferredTo) : undefined,
      },
      this.ctx(user, req),
    );
  }

  @Post('espera/:id/ofrecido')
  @RequirePermission('waitlist.manage')
  ofrecido(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User, @Req() req: Request) {
    return this.seguimiento.marcarOfrecido(id, this.ctx(user, req));
  }

  @Post('espera/:id/retirar')
  @RequirePermission('waitlist.manage')
  retirar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RetirarDto,
    @CurrentUser() user: User,
    @Req() req: Request,
  ) {
    return this.seguimiento.retirar(id, dto.motivo, this.ctx(user, req));
  }
}
