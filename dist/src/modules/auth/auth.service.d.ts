import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { User } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import type { AuthResponse } from './dto/auth-response.dto';
export interface AuthContext {
    ip?: string | null;
    userAgent?: string | null;
}
export declare class AuthService {
    private readonly prisma;
    private readonly jwt;
    private readonly config;
    private readonly audit;
    private readonly logger;
    constructor(prisma: PrismaService, jwt: JwtService, config: ConfigService, audit: AuditService);
    private fingerprint;
    private refreshSecret;
    validateUser(email: string, password: string): Promise<User | null>;
    private issueTokens;
    login(user: User, ctx?: AuthContext): Promise<AuthResponse>;
    recordFailedLogin(email: string, ctx?: AuthContext): Promise<void>;
    refresh(refreshToken: string, ctx?: AuthContext): Promise<AuthResponse>;
    logout(userId: string): Promise<void>;
}
