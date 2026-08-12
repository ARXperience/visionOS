import { SetMetadata } from '@nestjs/common';

import type { PermissionKey } from '../permissions';

export const PERMISSIONS_KEY = 'permisosRequeridos';

/**
 * Exige TODOS los permisos indicados. Se declara el permiso, no el rol:
 * cambiar quien puede hacer algo es editar la matriz, no cazar decoradores
 * por todo el codigo.
 */
export const RequirePermission = (...permisos: PermissionKey[]) =>
  SetMetadata(PERMISSIONS_KEY, permisos);
