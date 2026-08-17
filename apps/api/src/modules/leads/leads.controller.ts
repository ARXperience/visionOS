import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, Req } from '@nestjs/common';
import type { LeadStatus, User } from '@prisma/client';
import { IsNumber, IsOptional, IsString, IsUUID, Min, MaxLength, MinLength } from 'class-validator';
import type { Request } from 'express';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { LeadsService } from './leads.service';

class AsignarDto {
  @IsOptional() @IsUUID() userId?: string;
}

class CotizarDto {
  @IsNumber() @Min(0) amount!: number;
  @IsOptional() @IsUUID() serviceId?: string;
  @IsOptional() @IsString() @MaxLength(1000) nota?: string;
}

class PerderDto {
  @IsString() @MinLength(3) @MaxLength(200) motivo!: string;
}

@Controller('leads')
export class LeadsController {
  constructor(private readonly leads: LeadsService) {}

  private ctx(user: User, req: Request) {
    return { actor: user, ip: req.ip };
  }

  @Get()
  @RequirePermission('lead.read')
  listar(
    @Query('status') status?: LeadStatus,
    @Query('assignedToId') assignedToId?: string,
    @Query('siteId') siteId?: string,
    @Query('sinTocar') sinTocar?: string,
  ) {
    return this.leads.listar({ status, assignedToId, siteId, sinTocar: sinTocar === 'true' });
  }

  @Get('embudo')
  @RequirePermission('lead.read')
  embudo(@Query('desde') desde?: string, @Query('hasta') hasta?: string) {
    return this.leads.embudo(desde ? new Date(desde) : undefined, hasta ? new Date(hasta) : undefined);
  }

  @Post(':id/asignar')
  @RequirePermission('lead.write')
  asignar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AsignarDto,
    @CurrentUser() user: User,
    @Req() req: Request,
  ) {
    return this.leads.asignar(id, dto.userId ?? null, this.ctx(user, req));
  }

  @Post(':id/cotizar')
  @RequirePermission('lead.write')
  cotizar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CotizarDto,
    @CurrentUser() user: User,
    @Req() req: Request,
  ) {
    return this.leads.cotizar(id, dto, this.ctx(user, req));
  }

  @Post(':id/perder')
  @RequirePermission('lead.write')
  perder(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PerderDto,
    @CurrentUser() user: User,
    @Req() req: Request,
  ) {
    return this.leads.perder(id, dto.motivo, this.ctx(user, req));
  }
}
