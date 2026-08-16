import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Req } from '@nestjs/common';
import type { User, UserRole } from '@prisma/client';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import type { Request } from 'express';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { ROLE_PERMISSIONS } from '../../common/permissions';
import { UsersService } from './users.service';

const ROLES = [
  'SUPERADMIN', 'ADMIN_SEDE', 'COORDINACION', 'RECEPCION', 'AGENDAMIENTO',
  'CALL_CENTER', 'PROFESIONAL', 'FACTURACION', 'AUDITOR',
] as const;

/**
 * 12 caracteres, no 8.
 *
 * Ocho es el mínimo que pide el formulario de acceso y es poco para una
 * cuenta que crea un administrador y que probablemente no se cambie en
 * meses. No se exige mezcla de símbolos: obliga a patrones tipo `Clave1!`
 * que son más cortos de adivinar que una frase larga.
 */
const CLAVE_MINIMA = 12;

class CrearUsuarioDto {
  @IsEmail({}, { message: 'Correo inválido' }) email!: string;
  @IsString() @MinLength(CLAVE_MINIMA, { message: `Mínimo ${CLAVE_MINIMA} caracteres` }) @MaxLength(200) password!: string;
  @IsString() @MinLength(2) @MaxLength(60) firstName!: string;
  @IsString() @MinLength(2) @MaxLength(60) lastName!: string;
  @IsOptional() @IsString() @MaxLength(20) phone?: string;
  @IsIn(ROLES as unknown as string[]) role!: UserRole;
  @IsArray() @ArrayNotEmpty({ message: 'Asigne al menos una sede' }) @IsUUID('4', { each: true }) siteIds!: string[];
  @IsOptional() @IsBoolean() crossSitePatientRead?: boolean;
}

class ActualizarUsuarioDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(60) firstName?: string;
  @IsOptional() @IsString() @MinLength(2) @MaxLength(60) lastName?: string;
  @IsOptional() @IsString() @MaxLength(20) phone?: string;
  @IsOptional() @IsIn(ROLES as unknown as string[]) role?: UserRole;
  @IsOptional() @IsBoolean() crossSitePatientRead?: boolean;
  @IsOptional() @IsArray() @IsUUID('4', { each: true }) siteIds?: string[];
}

class ClaveDto {
  @IsString() @MinLength(CLAVE_MINIMA, { message: `Mínimo ${CLAVE_MINIMA} caracteres` }) @MaxLength(200) password!: string;
}

class EstadoDto {
  @IsBoolean() activo!: boolean;
}

@Controller('usuarios')
export class UsersController {
  constructor(private readonly usuarios: UsersService) {}

  private ctx(user: User, req: Request) {
    return { actor: user, ip: req.ip ?? null };
  }

  /** Los roles y lo que puede cada uno, para que la pantalla no lo adivine. */
  @RequirePermission('user.read')
  @Get('roles')
  roles() {
    return ROLES.map((r) => ({
      role: r,
      permisos: ROLE_PERMISSIONS[r].length,
      // Se listan para que quien asigna un rol vea exactamente qué concede.
      detalle: [...ROLE_PERMISSIONS[r]],
    }));
  }

  @RequirePermission('user.read')
  @Get()
  listar() {
    return this.usuarios.listar();
  }

  @RequirePermission('user.manage')
  @Post()
  crear(@Body() dto: CrearUsuarioDto, @CurrentUser() user: User, @Req() req: Request) {
    return this.usuarios.crear(dto, this.ctx(user, req));
  }

  @RequirePermission('user.manage')
  @Patch(':id')
  actualizar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ActualizarUsuarioDto,
    @CurrentUser() user: User,
    @Req() req: Request,
  ) {
    return this.usuarios.actualizar(id, dto, this.ctx(user, req));
  }

  @RequirePermission('user.manage')
  @Post(':id/clave')
  clave(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ClaveDto,
    @CurrentUser() user: User,
    @Req() req: Request,
  ) {
    return this.usuarios.cambiarClave(id, dto.password, this.ctx(user, req));
  }

  @RequirePermission('user.manage')
  @Post(':id/estado')
  estado(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: EstadoDto,
    @CurrentUser() user: User,
    @Req() req: Request,
  ) {
    return this.usuarios.cambiarEstado(id, dto.activo, this.ctx(user, req));
  }

  /**
   * Da de baja, no borra. La fila se conserva porque sus registros de
   * auditoría, citas y mensajes apuntan a ella.
   */
  @RequirePermission('user.manage')
  @Delete(':id')
  baja(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User, @Req() req: Request) {
    return this.usuarios.darDeBaja(id, this.ctx(user, req));
  }
}
