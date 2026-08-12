import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { User } from '@prisma/client';
import { createHash, randomBytes } from 'node:crypto';

import { HashUtil } from '../../common/utils/hash.util';
import { permissionsOf } from '../../common/permissions';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import type { AuthResponse } from './dto/auth-response.dto';

export interface AuthContext {
  ip?: string | null;
  userAgent?: string | null;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Huella determinista del refresh token. Se guarda SHA-256 y no bcrypt
   * porque la validación necesita BUSCAR por el token que envía el cliente,
   * y un hash con sal aleatoria no se puede buscar.
   */
  private fingerprint(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private refreshSecret(): string {
    const s = this.config.get<string>('JWT_REFRESH_SECRET');
    if (!s) throw new Error('JWT_REFRESH_SECRET es obligatorio');
    return s;
  }

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({ where: { email } });

    // Se compara siempre, exista el usuario o no: si solo se comparara cuando
    // existe, el tiempo de respuesta delataría qué correos están registrados.
    const hash = user?.passwordHash ?? '$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidin';
    const coincide = await HashUtil.compare(password, hash);

    if (!user || !coincide || user.status !== 'ACTIVE' || user.deletedAt) return null;
    return user;
  }

  private async issueTokens(user: User, ctx?: AuthContext): Promise<AuthResponse> {
    const accessToken = this.jwt.sign({ sub: user.id, email: user.email, role: user.role });

    // El refresh es un JWT propio con `typ`, para que un access token no pueda
    // usarse para renovar.
    const refreshToken = this.jwt.sign(
      { sub: user.id, typ: 'refresh', jti: randomBytes(16).toString('hex') },
      {
        secret: this.refreshSecret(),
        expiresIn: this.config.get<string>('JWT_REFRESH_EXPIRES_IN') ?? '30d',
      },
    );

    // Los vencimientos se leen del token ya firmado, no de una variable aparte
    // que puede quedar desincronizada con las opciones de firma.
    const access = this.jwt.decode(accessToken) as { exp?: number } | null;
    const refresh = this.jwt.decode(refreshToken) as { exp?: number } | null;

    await this.prisma.refreshToken.create({
      data: {
        token: this.fingerprint(refreshToken),
        userId: user.id,
        deviceInfo: ctx?.userAgent ?? null,
        ipAddress: ctx?.ip ?? null,
        expiresAt: refresh?.exp
          ? new Date(refresh.exp * 1000)
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    const sites = await this.prisma.userSiteAccess.findMany({
      where: { userId: user.id },
      select: { siteId: true, isPrimary: true },
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: access?.exp ? Math.max(0, access.exp - Math.floor(Date.now() / 1000)) : 900,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        permissions: [...permissionsOf(user)],
        siteIds: sites.map((s) => s.siteId),
        primarySiteId: sites.find((s) => s.isPrimary)?.siteId ?? sites[0]?.siteId ?? null,
      },
    };
  }

  async login(user: User, ctx?: AuthContext): Promise<AuthResponse> {
    const res = await this.issueTokens(user, ctx);

    await this.prisma.user
      .update({
        where: { id: user.id },
        data: { lastLoginAt: new Date(), lastLoginIp: ctx?.ip ?? null },
      })
      .catch((e: Error) => this.logger.warn(`No se registró el último acceso: ${e.message}`));

    await this.audit.record({
      userId: user.id,
      action: 'LOGIN',
      entityType: 'user',
      entityId: user.id,
      ipAddress: ctx?.ip,
      userAgent: ctx?.userAgent,
    });

    return res;
  }

  async recordFailedLogin(email: string, ctx?: AuthContext): Promise<void> {
    await this.audit.record({
      action: 'LOGIN_FAILED',
      entityType: 'user',
      // El correo intentado va en newValues: sin él, un ataque por fuerza
      // bruta es indistinguible de alguien que olvidó su contraseña.
      newValues: { email },
      ipAddress: ctx?.ip,
      userAgent: ctx?.userAgent,
    });
  }

  /**
   * Renueva con rotación: el refresh entregado queda revocado al canjearse.
   */
  async refresh(refreshToken: string, ctx?: AuthContext): Promise<AuthResponse> {
    if (!refreshToken) throw new UnauthorizedException('Falta el refresh token');

    let payload: { sub?: string; typ?: string };
    try {
      payload = this.jwt.verify(refreshToken, { secret: this.refreshSecret() });
    } catch {
      throw new UnauthorizedException('Refresh token inválido o vencido');
    }
    if (payload.typ !== 'refresh' || !payload.sub) {
      throw new UnauthorizedException('Refresh token inválido');
    }

    const guardado = await this.prisma.refreshToken.findUnique({
      where: { token: this.fingerprint(refreshToken) },
    });
    if (!guardado || guardado.isRevoked || guardado.userId !== payload.sub) {
      throw new UnauthorizedException('Refresh token revocado');
    }
    if (guardado.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException('Refresh token vencido');
    }

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || user.deletedAt || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Usuario no habilitado');
    }

    await this.prisma.refreshToken.update({
      where: { id: guardado.id },
      data: { isRevoked: true },
    });

    return this.issueTokens(user, {
      ip: ctx?.ip ?? guardado.ipAddress,
      userAgent: ctx?.userAgent ?? guardado.deviceInfo,
    });
  }

  async logout(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, isRevoked: false },
      data: { isRevoked: true },
    });
    await this.audit.record({
      userId,
      action: 'LOGOUT',
      entityType: 'user',
      entityId: userId,
    });
  }
}
