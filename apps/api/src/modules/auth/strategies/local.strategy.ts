import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import type { User } from '@prisma/client';
import type { Request } from 'express';
import { Strategy } from 'passport-local';

import { AuthService } from '../auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly auth: AuthService) {
    // passReqToCallback para poder auditar el intento fallido con su IP.
    // Sin la IP, una fuerza bruta es indistinguible de alguien que olvidó
    // su contraseña, y esa es justo la diferencia que hay que poder ver.
    super({ usernameField: 'email', passReqToCallback: true });
  }

  async validate(req: Request, email: string, password: string): Promise<User> {
    const user = await this.auth.validateUser(email, password);

    if (!user) {
      await this.auth.recordFailedLogin(email, {
        ip: req.ip ?? null,
        userAgent: req.headers['user-agent'] ?? null,
      });
      // Mensaje único a propósito: no se distingue "no existe" de "clave mala".
      throw new UnauthorizedException('Credenciales inválidas');
    }

    return user;
  }
}
