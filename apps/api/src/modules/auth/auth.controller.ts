import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { User } from '@prisma/client';
import type { CookieOptions, Request, Response } from 'express';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { permissionsOf } from '../../common/permissions';
import { AuthService, type AuthContext } from './auth.service';
import type { AuthResponse } from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';

const COOKIE_REFRESH = 'vision_rt';

/**
 * No hay POST /register. En una clínica las cuentas las crea un administrador:
 * un registro público dejaría entrar a cualquiera a un sistema con datos de
 * pacientes.
 *
 * El refresh token sale en una cookie httpOnly y NO en el cuerpo. Es la razón
 * de servir todo bajo el mismo dominio: un token en localStorage lo lee
 * cualquier XSS, y aquí lo que hay detrás son historias clínicas. El access
 * token sí va en el cuerpo, para que el cliente lo tenga solo en memoria.
 */
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  private ctx(req: Request): AuthContext {
    return { ip: req.ip ?? null, userAgent: req.headers['user-agent'] ?? null };
  }

  private opcionesCookie(maxAge?: number): CookieOptions {
    // Con el panel en Vercel y la API en Hostinger son dos ORÍGENES
    // distintos. La cookie solo sobrevive si ambos cuelgan del mismo dominio
    // registrable —visioncolombia.com.co y api.visioncolombia.com.co— y se
    // emite para el dominio padre. Si algún día el panel quedara en un
    // dominio ajeno (un *.vercel.app suelto), esta cookie deja de llegar y
    // habría que volver a un solo origen o pasar el refresh por cabecera,
    // que es peor.
    const dominio = process.env.COOKIE_DOMAIN;

    return {
      httpOnly: true,
      // Lax y no Strict: con Strict, llegar desde un enlace externo al panel
      // no manda la cookie y el usuario ve un login que no esperaba.
      // Entre subdominios del mismo sitio, Lax sí viaja.
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      // Solo se envía a la ruta que la necesita.
      path: '/api/auth',
      ...(dominio ? { domain: dominio } : {}),
      ...(maxAge === undefined ? {} : { maxAge }),
    };
  }

  /** Guarda el refresh en la cookie y lo quita del cuerpo. */
  private responder(res: Response, r: AuthResponse) {
    const { refreshToken, ...cuerpo } = r;
    res.cookie(COOKIE_REFRESH, refreshToken, this.opcionesCookie(30 * 24 * 60 * 60 * 1000));
    return cuerpo;
  }

  @Public()
  @UseGuards(AuthGuard('local'))
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(
    @Body() _dto: LoginDto,
    @CurrentUser() user: User,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.responder(res, await this.auth.login(user, this.ctx(req)));
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = req.cookies?.[COOKIE_REFRESH] as string | undefined;
    return this.responder(res, await this.auth.refresh(token ?? '', this.ctx(req)));
  }

  /** Quién soy. Lo usa el cliente al cargar para saber si hay sesión viva. */
  @Get('yo')
  yo(@CurrentUser() user: User) {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      permissions: [...permissionsOf(user)],
    };
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('logout')
  async logout(@CurrentUser('id') userId: string, @Res({ passthrough: true }) res: Response) {
    await this.auth.logout(userId);
    res.clearCookie(COOKIE_REFRESH, this.opcionesCookie());
  }
}
