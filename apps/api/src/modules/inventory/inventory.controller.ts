import { Body, Controller, Get, Post, Query, Req } from '@nestjs/common';
import type { ProductKind, StockMoveKind, User } from '@prisma/client';
import {
  IsBoolean,
  IsDateString,
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
import { InventoryService } from './inventory.service';

const TIPOS = [
  'INSUMO',
  'MEDICAMENTO',
  'MATERIAL_QUIRURGICO',
  'LENTE_INTRAOCULAR',
  'MONTURA',
  'LENTE_OFTALMICO',
  'LENTE_CONTACTO',
  'OTRO',
] as const;

const MOVIMIENTOS = ['ENTRADA', 'SALIDA', 'AJUSTE', 'BAJA'] as const;

class ProductoDto {
  @IsString() @MinLength(2) @MaxLength(40) sku!: string;
  @IsString() @MinLength(2) @MaxLength(160) name!: string;
  @IsIn(TIPOS as unknown as string[]) kind!: ProductKind;
  @IsOptional() @IsString() @MaxLength(80) brand?: string;
  @IsOptional() @IsString() @MaxLength(80) model?: string;
  @IsOptional() @IsString() @MaxLength(20) unit?: string;
  @IsOptional() @IsString() @MaxLength(40) invima?: string;
  @IsOptional() @IsBoolean() tracksLot?: boolean;
  @IsOptional() @IsInt() @Min(0) minQty?: number;
  @IsOptional() @IsNumber() @Min(0) salePrice?: number;
  @IsOptional() @IsNumber() @Min(0) costPrice?: number;
}

class MovimientoDto {
  @IsUUID() productId!: string;
  @IsUUID() siteId!: string;
  /** Los traslados van por su propia ruta: mueven dos sedes a la vez. */
  @IsIn(MOVIMIENTOS as unknown as string[]) kind!: StockMoveKind;
  @IsInt() @Min(1) @Max(100_000) quantity!: number;
  @IsOptional() @IsString() @MaxLength(80) lot?: string;
  @IsOptional() @IsDateString() expiresAt?: string;
  @IsOptional() @IsString() @MaxLength(300) reason?: string;
  @IsOptional() @IsNumber() @Min(0) unitCost?: number;
}

class TrasladoDto {
  @IsUUID() productId!: string;
  @IsUUID() desdeSiteId!: string;
  @IsUUID() haciaSiteId!: string;
  @IsInt() @Min(1) @Max(100_000) quantity!: number;
  @IsOptional() @IsString() @MaxLength(80) lot?: string;
  @IsOptional() @IsString() @MaxLength(300) reason?: string;
}

@Controller('inventario')
export class InventoryController {
  constructor(private readonly inventario: InventoryService) {}

  private ctx(user: User, req: Request) {
    return { actor: user, ip: req.ip };
  }

  @Get('productos')
  @RequirePermission('service.read')
  productos(
    @Query('kind') kind?: ProductKind,
    @Query('buscar') buscar?: string,
    @Query('incluirInactivos') incluirInactivos?: string,
  ) {
    return this.inventario.productos({ kind, buscar, soloActivos: incluirInactivos !== 'true' });
  }

  @Post('productos')
  @RequirePermission('service.manage')
  crearProducto(@Body() dto: ProductoDto) {
    return this.inventario.crearProducto(dto);
  }

  /** Lo accionable: qué falta y qué se está por vencer. */
  @Get('alertas')
  @RequirePermission('service.read')
  alertas(@Query('siteId') siteId?: string) {
    return this.inventario.alertas(siteId);
  }

  @Get('movimientos')
  @RequirePermission('service.read')
  movimientos(
    @Query('productId') productId?: string,
    @Query('siteId') siteId?: string,
    @Query('refType') refType?: string,
    @Query('refId') refId?: string,
  ) {
    return this.inventario.movimientos({ productId, siteId, refType, refId });
  }

  /** Recuenta el saldo desde el libro. Debería cuadrar siempre. */
  @Get('verificar')
  @RequirePermission('service.manage')
  verificar(@Query('siteId') siteId?: string) {
    return this.inventario.verificarSaldos(siteId);
  }

  @Post('movimientos')
  @RequirePermission('service.manage')
  mover(@Body() dto: MovimientoDto, @CurrentUser() user: User, @Req() req: Request) {
    return this.inventario.mover(
      { ...dto, expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined },
      this.ctx(user, req),
    );
  }

  @Post('traslados')
  @RequirePermission('service.manage')
  trasladar(@Body() dto: TrasladoDto, @CurrentUser() user: User, @Req() req: Request) {
    return this.inventario.trasladar(dto, this.ctx(user, req));
  }
}
