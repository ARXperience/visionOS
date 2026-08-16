import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Req } from '@nestjs/common';
import type { ProfessionalType, User } from '@prisma/client';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import type { Request } from 'express';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { ProfessionalsService } from './professionals.service';

const TIPOS = [
  'OFTALMOLOGO', 'OPTOMETRA', 'ORTOPTISTA', 'ANESTESIOLOGO', 'ENFERMERIA', 'ESTETICA', 'OTRO',
] as const;

const HORA = /^([01]\d|2[0-3]):([0-5]\d)$/;

class CrearDto {
  @IsString() @MinLength(4) @MaxLength(20) docNumber!: string;
  @IsString() @MinLength(2) @MaxLength(60) firstName!: string;
  @IsString() @MinLength(2) @MaxLength(60) lastName!: string;
  @IsIn(TIPOS as unknown as string[]) type!: ProfessionalType;
  /// Registro médico. RIPS lo exigirá en cada atención.
  @IsOptional() @IsString() @MaxLength(40) licenseNumber?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) specialties?: string[];
  @IsOptional() @IsString() @Matches(/^#[0-9a-f]{6}$/i) color?: string;
  @IsArray() @ArrayNotEmpty({ message: 'Asigne al menos una sede' }) @IsUUID('4', { each: true }) siteIds!: string[];
}

class ServiciosDto {
  @IsArray() @IsUUID('4', { each: true }) serviceIds!: string[];
}

class FranjaDto {
  @IsUUID() siteId!: string;
  @IsInt() @Min(0) @Max(6) weekday!: number;
  @IsString() @Matches(HORA, { message: 'Formato HH:MM' }) inicio!: string;
  @IsString() @Matches(HORA, { message: 'Formato HH:MM' }) fin!: string;
}

class BloqueoDto {
  @IsUUID() siteId!: string;
  @IsDateString() desde!: string;
  @IsDateString() hasta!: string;
  @IsString() @MinLength(3) @MaxLength(120) motivo!: string;
}

class EstadoDto {
  @IsBoolean() activo!: boolean;
}

@Controller('profesionales')
export class ProfessionalsController {
  constructor(private readonly profesionales: ProfessionalsService) {}

  private ctx(user: User, req: Request) {
    return { actor: user, ip: req.ip ?? null };
  }

  @RequirePermission('site.read')
  @Get()
  listar() {
    return this.profesionales.listar();
  }

  @RequirePermission('schedule.manage')
  @Post()
  crear(@Body() dto: CrearDto, @CurrentUser() user: User, @Req() req: Request) {
    return this.profesionales.crear(dto, this.ctx(user, req));
  }

  @RequirePermission('schedule.manage')
  @Post(':id/servicios')
  servicios(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ServiciosDto,
    @CurrentUser() user: User,
    @Req() req: Request,
  ) {
    return this.profesionales.asignarServicios(id, dto.serviceIds, this.ctx(user, req));
  }

  @RequirePermission('schedule.manage')
  @Post(':id/franjas')
  franja(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: FranjaDto,
    @CurrentUser() user: User,
    @Req() req: Request,
  ) {
    return this.profesionales.agregarFranja({ professionalId: id, ...dto }, this.ctx(user, req));
  }

  @RequirePermission('schedule.manage')
  @Delete('franjas/:id')
  quitarFranja(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User, @Req() req: Request) {
    return this.profesionales.quitarFranja(id, this.ctx(user, req));
  }

  @RequirePermission('site.read')
  @Get(':id/bloqueos')
  bloqueos(@Param('id', ParseUUIDPipe) id: string) {
    return this.profesionales.bloqueos(id);
  }

  /** Vacaciones, congreso, incapacidad: reserva de recurso sin cita. */
  @RequirePermission('schedule.manage')
  @Post(':id/bloqueos')
  bloquear(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: BloqueoDto,
    @CurrentUser() user: User,
    @Req() req: Request,
  ) {
    return this.profesionales.bloquear({ professionalId: id, ...dto }, this.ctx(user, req));
  }

  @RequirePermission('schedule.manage')
  @Delete('bloqueos/:id')
  quitarBloqueo(@Param('id', ParseUUIDPipe) id: string) {
    return this.profesionales.quitarBloqueo(id);
  }

  @RequirePermission('schedule.manage')
  @Post(':id/estado')
  estado(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: EstadoDto,
    @CurrentUser() user: User,
    @Req() req: Request,
  ) {
    return this.profesionales.cambiarEstado(id, dto.activo, this.ctx(user, req));
  }
}
