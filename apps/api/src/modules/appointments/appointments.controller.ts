import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, Req } from '@nestjs/common';
import type { AppointmentStatus, User } from '@prisma/client';
import {
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';
import type { Request } from 'express';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { AppointmentsService } from './appointments.service';
import { AvailabilityService } from './availability.service';

const ESTADOS = [
  'PROGRAMADA', 'CONFIRMADA', 'LLEGO', 'EN_ADMISION', 'EN_ESPERA', 'EN_ATENCION',
  'EN_PROCEDIMIENTO', 'PARA_FACTURAR', 'FINALIZADA', 'NO_ASISTIO', 'CANCELADA',
] as const;

class CrearCitaDto {
  @IsUUID() siteId!: string;
  @IsUUID() personId!: string;
  @IsUUID() serviceId!: string;
  @IsUUID() professionalId!: string;
  @IsOptional() @IsUUID() roomId?: string;
  @IsOptional() @IsUUID() equipmentId?: string;
  @IsDateString() startsAt!: string;
  @IsOptional() @IsIn(['OD', 'OI', 'AO', 'NA']) laterality?: 'OD' | 'OI' | 'AO' | 'NA';
  @IsOptional() @IsString() @MaxLength(1000) notes?: string;
}

class EstadoDto {
  @IsIn(ESTADOS as unknown as string[]) estado!: AppointmentStatus;
  @IsOptional() @IsString() @MaxLength(300) motivo?: string;
  @IsOptional() @IsIn(['PACIENTE', 'CLINICA', 'PROFESIONAL', 'ASEGURADOR', 'SISTEMA'])
  actor?: 'PACIENTE' | 'CLINICA' | 'PROFESIONAL' | 'ASEGURADOR' | 'SISTEMA';
}

@Controller('agenda')
export class AppointmentsController {
  constructor(
    private readonly citas: AppointmentsService,
    private readonly disponibilidad: AvailabilityService,
  ) {}

  /** Cupos ofrecibles. Es un cálculo: la corrección la garantiza el EXCLUDE. */
  @RequirePermission('appointment.read')
  @Get('disponibilidad')
  huecos(
    @Query('siteId', ParseUUIDPipe) siteId: string,
    @Query('serviceId', ParseUUIDPipe) serviceId: string,
    @Query('fecha') fecha: string,
    @Query('professionalId') professionalId?: string,
  ) {
    return this.disponibilidad.huecos({ siteId, serviceId, fecha, professionalId });
  }

  @RequirePermission('appointment.read')
  @Get()
  agenda(@Query('siteId', ParseUUIDPipe) siteId: string, @Query('fecha') fecha: string) {
    return this.citas.agenda(siteId, fecha);
  }

  @RequirePermission('appointment.write')
  @Post()
  crear(@Body() dto: CrearCitaDto, @CurrentUser() user: User, @Req() req: Request) {
    return this.citas.crear(
      { ...dto, startsAt: new Date(dto.startsAt), createdVia: 'PRESENCIAL' },
      { user, ip: req.ip ?? null },
    );
  }

  @RequirePermission('appointment.write')
  @Post(':id/estado')
  estado(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: EstadoDto,
    @CurrentUser() user: User,
  ) {
    return this.citas.cambiarEstado(id, dto.estado, {
      user,
      motivo: dto.motivo,
      actor: dto.actor,
    });
  }
}
