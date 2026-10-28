import type { UserRole } from '@prisma/client';
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
