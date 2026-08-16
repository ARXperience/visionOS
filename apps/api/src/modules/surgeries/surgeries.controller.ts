import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, Req } from '@nestjs/common';
import type { AnesthesiaType, Laterality, User } from '@prisma/client';
import {
  IsIn,
  IsNumber,
  IsObject,
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
import { FASES, type Fase } from './lista-oms';
import { SurgeriesService } from './surgeries.service';

const OJOS = ['OD', 'OI'] as const;
const ANESTESIA = ['TOPICA', 'LOCAL', 'PERIBULBAR', 'SEDACION', 'GENERAL'] as const;

class ProgramarDto {
  @IsUUID() appointmentId!: string;
  @IsIn(OJOS as unknown as string[]) laterality!: Laterality;
  @IsUUID() surgeonId!: string;
  @IsOptional() @IsUUID() anesthesiologistId?: string;
  @IsOptional() @IsIn(ANESTESIA as unknown as string[]) anesthesia?: AnesthesiaType;
  @IsOptional() @IsString() @MaxLength(500) teamNotes?: string;
}

class ConsentimientoDto {
  @IsOptional() @IsString() @MaxLength(500) fileUrl?: string;
}

class FaseDto {
  @IsObject() respuestas!: Record<string, unknown>;
  /** Solo en la pausa: el ojo, escrito de nuevo por quien está en quirófano. */
  @IsOptional() @IsIn(OJOS as unknown as string[]) lateralidadConfirmada?: Laterality;
}

class FinalizarDto {
  @IsOptional() @IsString() @MaxLength(5000) findings?: string;
  @IsOptional() @IsString() @MaxLength(5000) complications?: string;
}

class SuspenderDto {
  @IsString() @MinLength(5) @MaxLength(300) motivo!: string;
}

class ImplanteDto {
  @IsString() @MinLength(2) @MaxLength(80) kind!: string;
  @IsOptional() @IsString() @MaxLength(80) brand?: string;
  @IsOptional() @IsString() @MaxLength(80) model?: string;
  @IsOptional() @IsNumber() @Min(-30) @Max(60) power?: number;
  @IsOptional() @IsString() @MaxLength(80) lot?: string;
  @IsOptional() @IsString() @MaxLength(80) serial?: string;
  @IsOptional() @IsString() @MaxLength(80) invima?: string;
}

@Controller('cirugias')
export class SurgeriesController {
  constructor(private readonly cirugias: SurgeriesService) {}

  private ctx(user: User, req: Request) {
    return { actor: user, ip: req.ip };
  }

  /** La lista de la OMS, para que la pantalla no la duplique. */
  @Get('lista-verificacion')
  @RequirePermission('patient.read')
  lista() {
    return FASES;
  }

  @Get()
  @RequirePermission('patient.read')
  listar(
    @Query('siteId') siteId?: string,
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
    @Query('status') status?: string,
    @Query('personId') personId?: string,
  ) {
    return this.cirugias.listar({
      siteId,
      status,
      personId,
      desde: desde ? new Date(desde) : undefined,
      hasta: hasta ? new Date(hasta) : undefined,
    });
  }

  @Get('indicadores')
  @RequirePermission('dashboard.read')
  indicadores(@Query('siteId') siteId?: string) {
    return this.cirugias.indicadores(siteId);
  }

  /** Qué pacientes tienen un implante de este lote. La consulta del retiro. */
  @Get('trazabilidad')
  @RequirePermission('patient.read')
  trazabilidad(
    @Query('lot') lot?: string,
    @Query('serial') serial?: string,
    @Query('model') model?: string,
  ) {
    return this.cirugias.trazabilidad({ lot, serial, model });
  }

  @Get(':id')
  @RequirePermission('patient.read')
  ver(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User, @Req() req: Request) {
    return this.cirugias.ver(id, this.ctx(user, req));
  }

  @Post()
  @RequirePermission('patient.write')
  programar(@Body() dto: ProgramarDto, @CurrentUser() user: User, @Req() req: Request) {
    return this.cirugias.programar(dto, this.ctx(user, req));
  }

  @Post(':id/consentimiento')
  @RequirePermission('patient.write')
  consentimiento(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ConsentimientoDto,
    @CurrentUser() user: User,
    @Req() req: Request,
  ) {
    return this.cirugias.registrarConsentimiento(id, dto.fileUrl, this.ctx(user, req));
  }

  @Post(':id/verificacion/:fase')
  @RequirePermission('patient.write')
  fase(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('fase') fase: string,
    @Body() dto: FaseDto,
    @CurrentUser() user: User,
    @Req() req: Request,
  ) {
    const f = fase.toUpperCase() as Fase;
    return this.cirugias.cerrarFase(id, f, dto.respuestas, dto.lateralidadConfirmada, this.ctx(user, req));
  }

  @Post(':id/iniciar')
  @RequirePermission('patient.write')
  iniciar(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User, @Req() req: Request) {
    return this.cirugias.iniciar(id, this.ctx(user, req));
  }

  @Post(':id/finalizar')
  @RequirePermission('patient.write')
  finalizar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: FinalizarDto,
    @CurrentUser() user: User,
    @Req() req: Request,
  ) {
    return this.cirugias.finalizar(id, dto, this.ctx(user, req));
  }

  @Post(':id/suspender')
  @RequirePermission('patient.write')
  suspender(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SuspenderDto,
    @CurrentUser() user: User,
    @Req() req: Request,
  ) {
    return this.cirugias.suspender(id, dto.motivo, this.ctx(user, req));
  }

  @Post(':id/implantes')
  @RequirePermission('patient.write')
  implante(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ImplanteDto,
    @CurrentUser() user: User,
    @Req() req: Request,
  ) {
    return this.cirugias.registrarImplante(id, dto, this.ctx(user, req));
  }
}
