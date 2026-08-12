import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { User } from '@prisma/client';
import type { Request } from 'express';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { AuthService, type AuthContext } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';

/**
 * No hay POST /register. En una clínica las cuentas las crea un administrador
 * desde /admin/usuarios: un endpoint público de registro dejaría entrar a
 * cualquiera a un sistema con datos de pacientes.
 */
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  private ctx(req: Request): AuthContext {
    return {
      ip: req.ip ?? null,
      userAgent: req.headers['user-agent'] ?? null,
    };
  }

  @Public()
  @UseGuards(AuthGuard('local'))
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(@Body() _dto: LoginDto, @CurrentUser() user: User, @Req() req: Request) {
    return this.auth.login(user, this.ctx(req));
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  refresh(@Body() dto: RefreshTokenDto, @Req() req: Request) {
    return this.auth.refresh(dto.refreshToken, this.ctx(req));
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('logout')
  async logout(@CurrentUser('id') userId: string) {
    await this.auth.logout(userId);
  }
}
