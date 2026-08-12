import type { UserRole } from '@prisma/client';

/**
 * Los permisos viajan resueltos en la respuesta para que la interfaz sepa que
 * puede pintar sin adivinar a partir del rol. La autorizacion de verdad sigue
 * ocurriendo en el servidor: esto es solo para la UI.
 */
export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    permissions: string[];
    siteIds: string[];
    primarySiteId: string | null;
  };
}
