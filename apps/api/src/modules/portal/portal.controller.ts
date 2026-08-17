import { Body, Controller, Post, Req } from '@nestjs/common';
import { IsIn, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import type { Request } from 'express';

import { Public } from '../../common/decorators/public.decorator';
import { PortalService } from './portal.service';

class ConsultaDto {
  @IsString() @MinLength(5) @MaxLength(12) codigo!: string;
  /** Los últimos cuatro del documento: el segundo dato que solo tiene el paciente. */
  @IsString() @Matches(/^\d{4}$/) ultimos4!: string;
}

class AccionDto extends ConsultaDto {
  @IsIn(['confirmar', 'cancelar']) accion!: 'confirmar' | 'cancelar';
}

/**
 * Rutas PÚBLICAS. Todo lo que se agregue aquí queda expuesto a internet sin
 * autenticación: piénselo dos veces antes de añadir un campo.
 *
 * Son POST y no GET a propósito, aunque consultar no cambie nada: un GET con
 * el documento del paciente en la URL termina en el log del proxy, en el
 * historial del navegador y en el Referer de cualquier recurso externo.
 */
@Controller('portal')
export class PortalController {
  constructor(private readonly portal: PortalService) {}

  @Public()
  @Post('consultar')
  consultar(@Body() dto: ConsultaDto, @Req() req: Request) {
    return this.portal.consultar(dto.codigo, dto.ultimos4, req.ip ?? 'desconocida');
  }

  @Public()
  @Post('responder')
  responder(@Body() dto: AccionDto, @Req() req: Request) {
    return this.portal.responder(dto.codigo, dto.ultimos4, dto.accion, req.ip ?? 'desconocida');
  }
}
