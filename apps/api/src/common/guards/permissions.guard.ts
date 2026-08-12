import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { User } from '@prisma/client';

import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { PERMISSIONS_KEY } from '../decorators/require-permission.decorator';
import { type PermissionKey, permissionsOf } from '../permissions';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    if (
      this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
        context.getHandler(),
        context.getClass(),
      ])
    ) {
      return true;
    }

    const requeridos = this.reflector.getAllAndOverride<PermissionKey[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requeridos?.length) return true;

    const user = context.switchToHttp().getRequest().user as User | undefined;
    if (!user) throw new ForbiddenException('Acceso denegado');

    const efectivos = permissionsOf(user);
    const faltantes = requeridos.filter((p) => !efectivos.has(p));
    if (faltantes.length) {
      // Se nombra el permiso, no el rol: quien lee el error sabe que pedir.
      throw new ForbiddenException(`Falta el permiso: ${faltantes.join(', ')}`);
    }
    return true;
  }
}
