import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, Req } from '@nestjs/common';
import type { Laterality, ServiceOrderStatus, User } from '@prisma/client';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  IsUrl,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import type { Request } from 'express';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { OrdersService } from './orders.service';

const ESTADOS = ['PENDIENTE', 'AUTORIZADA', 'AGENDADA', 'REALIZADA', 'INFORMADA', 'ANULADA', 'VENCIDA'] as const;

class CrearOrdenDto {
  @IsUUID() personId!: string;
  @IsUUID() serviceId!: string;
  @IsOptional() @IsIn(['OD', 'OI', 'AO', 'NA']) laterality?: Laterality;
  @IsOptional() @IsUUID() originAppointmentId?: string;
  @IsOptional() @IsUUID() orderedByProfessionalId?: string;
  @IsOptional() @IsString() @MaxLength(1000) indications?: string;
  @IsOptional() @IsString() @MaxLength(500) externalOrderUrl?: string;
  @IsOptional() @IsInt() @Min(1) @Max(365) vigenciaDias?: number;
}

class AutorizarDto {
  @IsString() @MinLength(3) @MaxLength(60) numero!: string;
}

class ResultadoDto {
  @IsString() @MaxLength(1000) fileUrl!: string;
  @IsString() @MaxLength(200) fileName!: string;
  @IsString() @MaxLength(100) mimeType!: string;
  @IsInt() @Min(1) sizeBytes!: number;
  /** Hexadecimal de 64 caracteres. Se valida el formato, no el contenido. */
  @IsOptional() @IsString() @Matches(/^[a-f0-9]{64}$/i) sha256?: string;
  @IsOptional() @IsString() contenidoBase64?: string;
  @IsOptional() @IsString() @MaxLength(20_000) reportText?: string;
  @IsOptional() @IsUUID() performedById?: string;
  @IsOptional() @IsUUID() equipmentId?: string;
  @IsOptional() @IsBoolean() isFinal?: boolean;
}

class AnularDto {
  @IsString() @MinLength(3) @MaxLength(300) motivo!: string;
}

@Controller('ordenes')
export class OrdersController {
  constructor(private readonly ordenes: OrdersService) {}

  private ctx(user: User, req: Request) {
    return { actor: user, ip: req.ip ?? null };
  }

  @RequirePermission('patient.read')
  @Get()
  listar(
    @Query('estado') estado?: string,
    @Query('personId') personId?: string,
    @Query('vencidas') vencidas?: string,
  ) {
    return this.ordenes.listar({
      estado: ESTADOS.includes(estado as never) ? (estado as ServiceOrderStatus) : undefined,
      personId,
      vencidas: vencidas === 'true',
    });
  }

  @RequirePermission('patient.read')
  @Get('pendientes')
  pendientes() {
    return this.ordenes.pendientes();
  }

  @RequirePermission('patient.write')
  @Post()
  crear(@Body() dto: CrearOrdenDto, @CurrentUser() user: User, @Req() req: Request) {
    return this.ordenes.crear(dto, this.ctx(user, req));
  }

  @RequirePermission('patient.write')
  @Post(':id/autorizar')
  autorizar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AutorizarDto,
    @CurrentUser() user: User,
    @Req() req: Request,
  ) {
    return this.ordenes.autorizar(id, dto.numero, this.ctx(user, req));
  }

  @RequirePermission('patient.write')
  @Post(':id/resultado')
  resultado(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResultadoDto,
    @CurrentUser() user: User,
    @Req() req: Request,
  ) {
    return this.ordenes.adjuntarResultado(id, dto, this.ctx(user, req));
  }

  /** Ver un resultado es acceder a dato clínico: queda auditado. */
  @RequirePermission('patient.read')
  @Get('resultados/:id')
  verResultado(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User, @Req() req: Request) {
    return this.ordenes.verResultado(id, this.ctx(user, req));
  }

  @RequirePermission('patient.write')
  @Post(':id/anular')
  anular(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AnularDto,
    @CurrentUser() user: User,
    @Req() req: Request,
  ) {
    return this.ordenes.anular(id, dto.motivo, this.ctx(user, req));
  }
}
