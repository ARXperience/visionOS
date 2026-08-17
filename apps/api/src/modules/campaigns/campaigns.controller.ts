import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, Req } from '@nestjs/common';
import type { User } from '@prisma/client';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import type { Request } from 'express';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { CampaignsService } from './campaigns.service';

const ESTADOS = ['PLANEADA', 'CONFIRMADA', 'EJECUTADA', 'CANCELADA'] as const;

class EmpresaDto {
  @IsString() @MinLength(5) @MaxLength(20) nit!: string;
  @IsString() @MinLength(2) @MaxLength(160) name!: string;
  @IsOptional() @IsString() @MaxLength(120) contactName?: string;
  @IsOptional() @IsString() @MaxLength(30) contactPhone?: string;
  @IsOptional() @IsString() @MaxLength(120) contactEmail?: string;
  @IsOptional() @IsString() @MaxLength(200) address?: string;
}

class CampanaDto {
  @IsUUID() companyId!: string;
  @IsOptional() @IsUUID() siteId?: string;
  @IsString() @MinLength(3) @MaxLength(160) name!: string;
  @IsDateString() scheduledAt!: string;
  @IsOptional() @IsString() @MaxLength(200) location?: string;
  @IsOptional() @IsInt() @Min(1) @Max(5000) expectedPeople?: number;
  @IsOptional() @IsString() @MaxLength(1000) notes?: string;
}

class ParticipanteDto {
  @IsString() @MinLength(4) @MaxLength(20) documento!: string;
  @IsString() @MinLength(2) @MaxLength(80) nombre!: string;
  @IsOptional() @IsString() @MaxLength(80) apellido?: string;
  @IsOptional() @IsString() @MaxLength(30) telefono?: string;
  @IsOptional() @IsString() @MaxLength(300) finding?: string;
  @IsOptional() @IsBoolean() needsFollowUp?: boolean;
}

class EstadoDto {
  @IsIn(ESTADOS as unknown as string[]) status!: (typeof ESTADOS)[number];
}

@Controller('campanas')
export class CampaignsController {
  constructor(private readonly campanas: CampaignsService) {}

  private ctx(user: User, req: Request) {
    return { actor: user, ip: req.ip };
  }

  @Get('empresas')
  @RequirePermission('lead.read')
  empresas() {
    return this.campanas.empresas();
  }

  @Post('empresas')
  @RequirePermission('lead.write')
  crearEmpresa(@Body() dto: EmpresaDto) {
    return this.campanas.crearEmpresa(dto);
  }

  @Get()
  @RequirePermission('lead.read')
  listar(@Query('status') status?: string) {
    return this.campanas.listar(status);
  }

  /** El entregable de una jornada: a quién hay que llamar. */
  @Get('pendientes')
  @RequirePermission('lead.read')
  pendientes() {
    return this.campanas.pendientesDeLlamar();
  }

  @Post()
  @RequirePermission('lead.write')
  crear(@Body() dto: CampanaDto, @CurrentUser() user: User, @Req() req: Request) {
    return this.campanas.crear({ ...dto, scheduledAt: new Date(dto.scheduledAt) }, this.ctx(user, req));
  }

  @Post(':id/participantes')
  @RequirePermission('patient.write')
  registrar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ParticipanteDto,
    @CurrentUser() user: User,
    @Req() req: Request,
  ) {
    return this.campanas.registrar(id, dto, this.ctx(user, req));
  }

  @Post(':id/estado')
  @RequirePermission('lead.write')
  estado(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: EstadoDto,
    @CurrentUser() user: User,
    @Req() req: Request,
  ) {
    return this.campanas.cambiarEstado(id, dto.status, this.ctx(user, req));
  }
}
