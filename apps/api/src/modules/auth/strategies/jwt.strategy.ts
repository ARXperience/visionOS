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
  async validate(payload: { sub: string; iat?: number }): Promise<User> {
    const user = await this.prisma.user.findFirst({
      where: { id: payload.sub, deletedAt: null },
    });
    if (!user) throw new UnauthorizedException('El usuario ya no existe');
    if (user.status !== 'ACTIVE') throw new UnauthorizedException('Cuenta deshabilitada');

    // Un token emitido ANTES del ultimo cambio de contrasena deja de valer.
    // Sin esto, cambiar una clave filtrada dejaria al atacante dentro hasta
    // quince minutos mas: revocar el refresh no toca el access ya emitido.
    if (user.passwordChangedAt && payload.iat) {
      // El `iat` va en segundos y se redondea hacia abajo; se resta un
      // segundo para no invalidar el token que la propia peticion acaba de
      // emitir.
      if (payload.iat * 1000 < user.passwordChangedAt.getTime() - 1000) {
        throw new UnauthorizedException('La contraseña cambió: vuelva a iniciar sesión');
      }
    }

    return user;
  }
}
