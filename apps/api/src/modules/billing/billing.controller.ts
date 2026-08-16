import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Query, Req } from '@nestjs/common';
import type { InvoiceStatus, PaymentMethod, User } from '@prisma/client';
import {
  IsIn,
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
import { BillingService } from './billing.service';

const MEDIOS = [
  'EFECTIVO',
  'TARJETA_DEBITO',
  'TARJETA_CREDITO',
  'TRANSFERENCIA',
  'PSE',
  'BONO',
  'OTRO',
] as const;

class CrearDto {
  @IsUUID() personId!: string;
  @IsUUID() siteId!: string;
  @IsOptional() @IsUUID() payerId?: string;
  @IsOptional() @IsString() @MaxLength(1000) notes?: string;
}

class ItemDto {
  @IsUUID() serviceId!: string;
  @IsOptional() @IsInt() @Min(1) @Max(100) quantity?: number;
  @IsOptional() @IsNumber() @Min(0) unitPrice?: number;
  @IsOptional() @IsNumber() @Min(0) discount?: number;
  @IsOptional() @IsUUID() appointmentId?: string;
}

class EmitirDto {
  /** 0 = de contado, se vence hoy. */
  @IsInt() @Min(0) @Max(365) diasPlazo!: number;
}

class PagoDto {
  @IsNumber() amount!: number;
  @IsIn(MEDIOS as unknown as string[]) method!: PaymentMethod;
  @IsOptional() @IsString() @MaxLength(100) reference?: string;
  @IsOptional() @IsString() @MaxLength(500) notes?: string;
}

class AnularDto {
  @IsString() @MinLength(5) @MaxLength(300) motivo!: string;
}

class RadicarDto {
  @IsString() @MinLength(2) @MaxLength(60) numero!: string;
}

class GlosaDto {
  @IsString() @MinLength(1) @MaxLength(20) code!: string;
  @IsString() @MinLength(5) @MaxLength(1000) reason!: string;
  @IsNumber() @Min(0) amount!: number;
}

class RespuestaGlosaDto {
  @IsString() @MinLength(5) @MaxLength(3000) answer!: string;
  @IsOptional() @IsNumber() @Min(0) acceptedAmount?: number;
}

@Controller('facturacion')
export class BillingController {
  constructor(private readonly facturacion: BillingService) {}

  private ctx(user: User, req: Request) {
    return { actor: user, ip: req.ip };
  }

  @Get()
  @RequirePermission('patient.read')
  listar(
    @Query('status') status?: InvoiceStatus,
    @Query('personId') personId?: string,
    @Query('payerId') payerId?: string,
    @Query('siteId') siteId?: string,
  ) {
    return this.facturacion.listar({ status, personId, payerId, siteId });
  }

  /** La cartera por edades: lo que se cobra hoy. */
  @Get('cartera')
  @RequirePermission('dashboard.read')
  cartera(@Query('payerId') payerId?: string) {
    return this.facturacion.cartera(payerId);
  }

  @Post()
  @RequirePermission('patient.write')
  crear(@Body() dto: CrearDto, @CurrentUser() user: User, @Req() req: Request) {
    return this.facturacion.crear(dto, this.ctx(user, req));
  }

  @Post(':id/items')
  @RequirePermission('patient.write')
  agregarItem(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ItemDto,
    @CurrentUser() user: User,
    @Req() req: Request,
  ) {
    return this.facturacion.agregarItem(id, dto, this.ctx(user, req));
  }

  @Delete('items/:itemId')
  @RequirePermission('patient.write')
  quitarItem(
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @CurrentUser() user: User,
    @Req() req: Request,
  ) {
    return this.facturacion.quitarItem(itemId, this.ctx(user, req));
  }

  @Post(':id/emitir')
  @RequirePermission('patient.write')
  emitir(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: EmitirDto,
    @CurrentUser() user: User,
    @Req() req: Request,
  ) {
    return this.facturacion.emitir(id, dto.diasPlazo, this.ctx(user, req));
  }

  @Post(':id/anular')
  @RequirePermission('patient.write')
  anular(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AnularDto,
    @CurrentUser() user: User,
    @Req() req: Request,
  ) {
    return this.facturacion.anular(id, dto.motivo, this.ctx(user, req));
  }

  @Post(':id/pagos')
  @RequirePermission('patient.write')
  pagar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PagoDto,
    @CurrentUser() user: User,
    @Req() req: Request,
  ) {
    return this.facturacion.registrarPago(id, dto, this.ctx(user, req));
  }

  @Post(':id/radicar')
  @RequirePermission('patient.write')
  radicar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RadicarDto,
    @CurrentUser() user: User,
    @Req() req: Request,
  ) {
    return this.facturacion.radicar(id, dto.numero, this.ctx(user, req));
  }

  @Post(':id/glosas')
  @RequirePermission('patient.write')
  glosa(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: GlosaDto,
    @CurrentUser() user: User,
    @Req() req: Request,
  ) {
    return this.facturacion.registrarGlosa(id, dto, this.ctx(user, req));
  }

  @Post('glosas/:glosaId/responder')
  @RequirePermission('patient.write')
  responderGlosa(
    @Param('glosaId', ParseUUIDPipe) glosaId: string,
    @Body() dto: RespuestaGlosaDto,
    @CurrentUser() user: User,
    @Req() req: Request,
  ) {
    return this.facturacion.responderGlosa(glosaId, dto, this.ctx(user, req));
  }
}
