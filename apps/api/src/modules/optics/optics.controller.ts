import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, Req } from '@nestjs/common';
import type { User } from '@prisma/client';
import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsNumber,
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
import { OpticsService } from './optics.service';

class FormulaDto {
  @IsUUID() personId!: string;
  @IsUUID() professionalId!: string;
  @IsOptional() @IsUUID() appointmentId?: string;
  @IsOptional() @IsInt() @Min(1) @Max(60) mesesVigencia?: number;

  // Los rangos son los físicamente posibles de un lente oftálmico. Un −40 de
  // esfera es un dedo que resbaló, no una fórmula.
  @IsOptional() @IsNumber() @Min(-30) @Max(30) odSphere?: number;
  @IsOptional() @IsNumber() @Min(-12) @Max(12) odCylinder?: number;
  @IsOptional() @IsInt() @Min(0) @Max(180) odAxis?: number;
  @IsOptional() @IsNumber() @Min(0) @Max(6) odAdd?: number;
  @IsOptional() @IsNumber() @Min(-30) @Max(30) oiSphere?: number;
  @IsOptional() @IsNumber() @Min(-12) @Max(12) oiCylinder?: number;
  @IsOptional() @IsInt() @Min(0) @Max(180) oiAxis?: number;
  @IsOptional() @IsNumber() @Min(0) @Max(6) oiAdd?: number;

  @IsOptional() @IsNumber() @Min(40) @Max(80) pupillaryDistance?: number;
  @IsOptional() @IsString() @MaxLength(60) lensType?: string;
  @IsOptional() @IsString() @MaxLength(1000) notes?: string;
}

class OrdenDto {
  @IsUUID() prescriptionId!: string;
  @IsUUID() siteId!: string;
  @IsOptional() @IsUUID() frameProductId?: string;
  @IsOptional() @IsBoolean() frameOwn?: boolean;
  @IsOptional() @IsString() @MaxLength(200) frameNote?: string;
  @IsOptional() @IsUUID() lensProductId?: string;
  @IsOptional() @IsString() @MaxLength(200) lensNote?: string;
  @IsOptional() @IsString() @MaxLength(120) lab?: string;
  @IsOptional() @IsDateString() promisedAt?: string;
  @IsOptional() @IsNumber() @Min(0) price?: number;
  @IsOptional() @IsInt() @Min(0) @Max(60) warrantyMonths?: number;
}

class LaboratorioDto {
  @IsString() @MinLength(2) @MaxLength(120) lab!: string;
  @IsOptional() @IsDateString() promisedAt?: string;
}

class EntregaDto {
  @IsOptional() @IsString() @MaxLength(160) deliveredTo?: string;
}

class AnularDto {
  @IsString() @MinLength(5) @MaxLength(300) motivo!: string;
}

@Controller('optica')
export class OpticsController {
  constructor(private readonly optica: OpticsService) {}

  private ctx(user: User, req: Request) {
    return { actor: user, ip: req.ip };
  }

  @Get('ordenes')
  @RequirePermission('patient.read')
  ordenes(
    @Query('status') status?: string,
    @Query('siteId') siteId?: string,
    @Query('personId') personId?: string,
  ) {
    return this.optica.ordenes({ status, siteId, personId });
  }

  @Get('formulas/:personId')
  @RequirePermission('patient.read')
  formulas(@Param('personId', ParseUUIDPipe) personId: string) {
    return this.optica.formulas(personId);
  }

  @Post('formulas')
  @RequirePermission('patient.write')
  emitir(@Body() dto: FormulaDto, @CurrentUser() user: User, @Req() req: Request) {
    return this.optica.emitirFormula(dto, this.ctx(user, req));
  }

  @Post('ordenes')
  @RequirePermission('patient.write')
  crear(@Body() dto: OrdenDto, @CurrentUser() user: User, @Req() req: Request) {
    return this.optica.crearOrden(
      { ...dto, promisedAt: dto.promisedAt ? new Date(dto.promisedAt) : undefined },
      this.ctx(user, req),
    );
  }

  @Post('ordenes/:id/laboratorio')
  @RequirePermission('patient.write')
  enviar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: LaboratorioDto,
    @CurrentUser() user: User,
    @Req() req: Request,
  ) {
    return this.optica.enviarALaboratorio(
      id,
      dto.lab,
      dto.promisedAt ? new Date(dto.promisedAt) : undefined,
      this.ctx(user, req),
    );
  }

  @Post('ordenes/:id/recibir')
  @RequirePermission('patient.write')
  recibir(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User, @Req() req: Request) {
    return this.optica.recibirDeLaboratorio(id, this.ctx(user, req));
  }

  @Post('ordenes/:id/entregar')
  @RequirePermission('patient.write')
  entregar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: EntregaDto,
    @CurrentUser() user: User,
    @Req() req: Request,
  ) {
    return this.optica.entregar(id, dto.deliveredTo, this.ctx(user, req));
  }

  @Post('ordenes/:id/anular')
  @RequirePermission('patient.write')
  anular(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AnularDto,
    @CurrentUser() user: User,
    @Req() req: Request,
  ) {
    return this.optica.anular(id, dto.motivo, this.ctx(user, req));
  }
}
