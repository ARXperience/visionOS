import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, Req } from '@nestjs/common';
import type { ConversationStatus, User } from '@prisma/client';
import { IsBoolean, IsIn, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import type { Request } from 'express';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { ConversationsService } from './conversations.service';

class EnviarDto {
  @IsString()
  @MinLength(1)
  // WhatsApp corta bastante más arriba, pero un mensaje de 4000 caracteres
  // por chat no lo lee nadie: si hace falta tanto, es una llamada.
  @MaxLength(4000)
  texto!: string;

  /** Nota interna: se ve en el panel y NO le llega al paciente. */
  @IsOptional()
  @IsBoolean()
  interno?: boolean;
}

class AsignarDto {
  @IsOptional()
  @IsUUID()
  userId?: string | null;
}

class AlternarDto {
  @IsBoolean()
  activa!: boolean;
}

@Controller('conversaciones')
export class ConversationsController {
  constructor(private readonly conversaciones: ConversationsService) {}

  private ctx(req: Request, user: User) {
    return { user, ip: req.ip ?? null, userAgent: req.headers['user-agent'] ?? null };
  }

  @RequirePermission('conversation.read')
  @Get()
  listar(
    @CurrentUser() user: User,
    @Query('estado') estado?: string,
    @Query('sinLeer') sinLeer?: string,
  ) {
    return this.conversaciones.listar(user, {
      estado: ['ABIERTA', 'PENDIENTE', 'CERRADA'].includes(estado ?? '')
        ? (estado as ConversationStatus)
        : undefined,
      sinLeer: sinLeer === 'true',
    });
  }

  @RequirePermission('conversation.read')
  @Get(':id')
  detalle(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User, @Req() req: Request) {
    return this.conversaciones.detalle(id, this.ctx(req, user));
  }

  @RequirePermission('conversation.write')
  @Post(':id/mensajes')
  enviar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: EnviarDto,
    @CurrentUser() user: User,
    @Req() req: Request,
  ) {
    return this.conversaciones.enviar(id, dto.texto, this.ctx(req, user), dto.interno ?? false);
  }

  @RequirePermission('conversation.read')
  @Post(':id/leido')
  leido(@Param('id', ParseUUIDPipe) id: string) {
    return this.conversaciones.marcarLeida(id);
  }

  @RequirePermission('conversation.assign')
  @Post(':id/asignar')
  asignar(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AsignarDto) {
    return this.conversaciones.asignar(id, dto.userId ?? null);
  }

  @RequirePermission('ai.toggle')
  @Post(':id/ia')
  ia(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AlternarDto) {
    return this.conversaciones.ia(id, dto.activa);
  }

  @RequirePermission('conversation.write')
  @Post(':id/cerrar')
  cerrar(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AlternarDto) {
    return this.conversaciones.cerrar(id, dto.activa);
  }
}
