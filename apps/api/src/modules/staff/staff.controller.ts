import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Req } from '@nestjs/common';
import type { CredentialKind, User } from '@prisma/client';
import { IsDateString, IsIn, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import type { Request } from 'express';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { StaffService } from './staff.service';

const TIPOS = [
  'TARJETA_PROFESIONAL',
  'RETHUS',
  'ESPECIALIZACION',
  'POLIZA_RESPONSABILIDAD',
  'CARNET_VACUNACION',
  'CURSO_SOPORTE_VITAL',
  'EXAMEN_OCUPACIONAL',
  'CONTRATO',
  'OTRO',
] as const;

class CredencialDto {
  @IsUUID() professionalId!: string;
  @IsIn(TIPOS as unknown as string[]) kind!: CredentialKind;
  @IsOptional() @IsString() @MaxLength(60) number?: string;
  @IsOptional() @IsString() @MaxLength(120) issuedBy?: string;
  @IsOptional() @IsDateString() issuedAt?: string;
  @IsOptional() @IsDateString() expiresAt?: string;
  @IsOptional() @IsString() @MaxLength(500) fileUrl?: string;
  @IsOptional() @IsString() @MaxLength(500) notes?: string;
}

@Controller('personal')
export class StaffController {
  constructor(private readonly personal: StaffService) {}

  private ctx(user: User, req: Request) {
    return { actor: user, ip: req.ip };
  }

  /** Lo que hay que mirar antes de una visita de habilitación. */
  @Get('alertas')
  @RequirePermission('user.read')
  alertas() {
    return this.personal.alertas();
  }

  @Get(':professionalId/credenciales')
  @RequirePermission('user.read')
  credenciales(@Param('professionalId', ParseUUIDPipe) professionalId: string) {
    return this.personal.deProfesional(professionalId);
  }

  @Post('credenciales')
  @RequirePermission('user.manage')
  registrar(@Body() dto: CredencialDto, @CurrentUser() user: User, @Req() req: Request) {
    return this.personal.registrar(
      {
        ...dto,
        issuedAt: dto.issuedAt ? new Date(dto.issuedAt) : undefined,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
      },
      this.ctx(user, req),
    );
  }

  @Delete('credenciales/:id')
  @RequirePermission('user.manage')
  eliminar(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User, @Req() req: Request) {
    return this.personal.eliminar(id, this.ctx(user, req));
  }
}
