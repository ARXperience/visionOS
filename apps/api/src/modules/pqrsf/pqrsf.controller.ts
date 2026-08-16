import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, Req } from '@nestjs/common';
import type { PqrsfEstado, PqrsfTipo, User } from '@prisma/client';
import { IsIn, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min, MinLength } from 'class-validator';
import type { Request } from 'express';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { PqrsfService } from './pqrsf.service';

const TIPOS = ['PETICION', 'QUEJA', 'RECLAMO', 'SUGERENCIA', 'FELICITACION'] as const;
const ESTADOS = ['RADICADA', 'EN_GESTION', 'RESPONDIDA', 'CERRADA'] as const;

class RadicarDto {
  @IsIn(TIPOS as unknown as string[]) tipo!: PqrsfTipo;
  @IsString() @MinLength(4) @MaxLength(200) asunto!: string;
  @IsString() @MinLength(10) @MaxLength(5000) detalle!: string;
  @IsOptional() @IsUUID() personId?: string;
  @IsOptional() @IsString() @MaxLength(120) nombre?: string;
  @IsOptional() @IsString() @MaxLength(120) contacto?: string;
  @IsOptional() @IsUUID() siteId?: string;
  @IsOptional() @IsUUID() serviceId?: string;
}

class AsignarDto {
  @IsUUID() userId!: string;
}

class ResponderDto {
  @IsString() @MinLength(10) @MaxLength(10_000) respuesta!: string;
}

class CerrarDto {
  @IsOptional() @IsInt() @Min(1) @Max(5) satisfaccion?: number;
}

@Controller('pqrsf')
export class PqrsfController {
  constructor(private readonly pqrsf: PqrsfService) {}

  private ctx(user: User, req: Request) {
    return { actor: user, ip: req.ip ?? null };
  }

  @RequirePermission('patient.read')
  @Get()
  listar(
    @Query('estado') estado?: string,
    @Query('vencidas') vencidas?: string,
    @Query('personId') personId?: string,
  ) {
    return this.pqrsf.listar({
      estado: ESTADOS.includes(estado as never) ? (estado as PqrsfEstado) : undefined,
      vencidas: vencidas === 'true',
      personId,
    });
  }

  @RequirePermission('patient.read')
  @Get('indicadores')
  indicadores() {
    return this.pqrsf.indicadores();
  }

  @RequirePermission('patient.write')
  @Post()
  radicar(@Body() dto: RadicarDto, @CurrentUser() user: User, @Req() req: Request) {
    return this.pqrsf.radicar(dto, this.ctx(user, req));
  }

  @RequirePermission('patient.write')
  @Post(':id/asignar')
  asignar(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AsignarDto, @CurrentUser() user: User, @Req() req: Request) {
    return this.pqrsf.asignar(id, dto.userId, this.ctx(user, req));
  }

  @RequirePermission('patient.write')
  @Post(':id/responder')
  responder(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ResponderDto, @CurrentUser() user: User, @Req() req: Request) {
    return this.pqrsf.responder(id, dto.respuesta, this.ctx(user, req));
  }

  @RequirePermission('patient.write')
  @Post(':id/cerrar')
  cerrar(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CerrarDto, @CurrentUser() user: User, @Req() req: Request) {
    return this.pqrsf.cerrar(id, dto.satisfaccion, this.ctx(user, req));
  }
}
