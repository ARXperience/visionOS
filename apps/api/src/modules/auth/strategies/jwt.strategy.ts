import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import type { User } from '@prisma/client';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const secret = config.get<string>('JWT_SECRET');
    if (!secret) throw new Error('JWT_SECRET es obligatorio');

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  /**
   * Se relee el usuario en cada peticion en vez de confiar en el payload:
   * suspender a alguien tiene que surtir efecto de inmediato, no cuando
   * venza su token.
   */
  async validate(payload: { sub: string }): Promise<User> {
    const user = await this.prisma.user.findFirst({
      where: { id: payload.sub, deletedAt: null },
    });
    if (!user) throw new UnauthorizedException('El usuario ya no existe');
    if (user.status !== 'ACTIVE') throw new UnauthorizedException('Cuenta deshabilitada');
    return user;
  }
}
