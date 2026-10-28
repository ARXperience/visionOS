import type { PermissionKey } from '../permissions';
export declare const PERMISSIONS_KEY = "permisosRequeridos";
export declare const RequirePermission: (...permisos: PermissionKey[]) => import("@nestjs/common").CustomDecorator<string>;
