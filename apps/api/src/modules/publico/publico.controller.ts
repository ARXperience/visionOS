import { BadRequestException, Body, Controller, Get, Post, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { PqrsfTipo } from '@prisma/client';
import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import type { Request } from 'express';

import { Public } from '../../common/decorators/public.decorator';
import { PqrsfService } from '../pqrsf/pqrsf.service';
import { PublicoService } from './publico.service';

const TIPOS = ['PETICION', 'QUEJA', 'RECLAMO', 'SUGERENCIA', 'FELICITACION'] as const;

class SolicitudDto {
  @IsString() @MinLength(3) @MaxLength(120) nombre!: string;
  @IsString() @MinLength(7) @MaxLength(25) telefono!: string;
  @IsOptional() @IsEmail() @MaxLength(160) correo?: string;
  /**
   * La casilla de la Ley 1581, como dato y no como supuesto. Sin ella no se
   * guarda a nadie: la evidencia de consentimiento tiene que reflejar lo que
   * el paciente marcó, no que existe un formulario con una casilla.
   */
  @IsBoolean() autorizacion!: boolean;
  /** Código de sede, no id: el id de la base no tiene por qué salir a la web. */
  @IsOptional() @IsString() @MaxLength(30) sede?: string;
  @IsOptional() @IsString() @MaxLength(80) servicio?: string;
  @IsOptional() @IsString() @MaxLength(1000) mensaje?: string;
  /**
   * Trampa para bots. El formulario la pinta escondida y ningún humano la
   * llena; si viene con algo, se responde 200 y no se crea nada — un 400 le
   * enseña al bot a reintentar sin ella.
   */
  @IsOptional() @IsString() @MaxLength(200) nit?: string;
}

class PqrsfDto {
  @IsIn(TIPOS as unknown as string[]) tipo!: PqrsfTipo;
  @IsString() @MinLength(3) @MaxLength(120) nombre!: string;
  @IsString() @MinLength(5) @MaxLength(120) contacto!: string;
  @IsString() @MinLength(4) @MaxLength(200) asunto!: string;
  @IsString() @MinLength(10) @MaxLength(5000) detalle!: string;
  @IsOptional() @IsString() @MaxLength(200) nit?: string;
}

/**
 * Rutas PÚBLICAS del sitio de la clínica. Igual que `/portal`: lo que se
 * añada aquí queda expuesto a internet sin autenticación.
 *
 * El límite es por IP y mucho más estrecho que el global de 120/min. Un
 * formulario de citas que acepta 120 envíos por minuto es un formulario que
 * llena la bandeja del mostrador de basura en una tarde.
 */
@Controller('publico')
export class PublicoController {
  constructor(
    private readonly publico: PublicoService,
    private readonly pqrsf: PqrsfService,
  ) {}

  @Public()
  @Get('sedes')
  sedes() {
    return this.publico.sedes();
  }

  @Public()
  @Get('servicios')
  servicios() {
    return this.publico.servicios();
  }

  @Public()
  @Throttle({ default: { limit: 6, ttl: 3_600_000 } })
  @Post('solicitudes')
  solicitar(@Body() dto: SolicitudDto, @Req() req: Request) {
    if (!dto.autorizacion) {
      throw new BadRequestException(
        'Falta autorizar el tratamiento de sus datos: sin eso no podemos guardarlos ni llamarlo.',
      );
    }

    if (dto.nit) {
      return {
        radicado: null,
        mensaje: 'Recibimos su solicitud. Un asesor se comunica con usted en horario hábil.',
      };
    }

    return this.publico.solicitar(dto, req.ip ?? null, req.headers['user-agent'] ?? null);
  }

  /**
   * PQRSF desde el sitio. Es un derecho de petición: el plazo legal empieza a
   * correr con el radicado, así que entra al mismo expediente que las que
   * radica el mostrador —con su vencimiento en días hábiles— y no a un correo
   * que alguien revisa cuando puede.
   */
  @Public()
  @Throttle({ default: { limit: 4, ttl: 3_600_000 } })
  @Post('pqrsf')
  async radicarPqrsf(@Body() dto: PqrsfDto, @Req() req: Request) {
    if (dto.nit) return { radicado: 'PQR-0000-0000', dueDate: null };

    const p = await this.pqrsf.radicar(
      {
        tipo: dto.tipo,
        asunto: dto.asunto,
        detalle: dto.detalle,
        nombre: dto.nombre,
        contacto: dto.contacto,
      },
      { actor: null, ip: req.ip ?? null },
    );

    return { radicado: p.radicado, dueDate: p.dueDate };
  }
}
