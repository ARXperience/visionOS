import {
  BadGatewayException,
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { PrismaService } from '../../prisma/prisma.service';

const GATEWAY = process.env.GATEWAY_URL ?? 'http://127.0.0.1:3002';

class CrearCanalDto {
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  nombre!: string;

  /** Sin sede = línea central de la clínica. */
  @IsOptional()
  @IsUUID()
  siteId?: string;
}

/**
 * Administración de las líneas de WhatsApp.
 *
 * `authState` NUNCA sale de aquí, ni siquiera cifrado: son las credenciales
 * con las que la clínica habla con sus pacientes, y un endpoint que las
 * devuelve es un endpoint que alguien acabará llamando.
 */
@Controller('canales')
export class ChannelsController {
  constructor(private readonly prisma: PrismaService) {}

  @RequirePermission('whatsapp.manage')
  @Get()
  listar() {
    return this.prisma.channel.findMany({
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        name: true,
        provider: true,
        status: true,
        phoneNumber: true,
        isDefault: true,
        lastConnectedAt: true,
        lastError: true,
        qrExpiresAt: true,
        site: { select: { id: true, code: true, name: true } },
        _count: { select: { conversations: true } },
      },
    });
  }

  @RequirePermission('whatsapp.manage')
  @Post()
  crear(@Body() dto: CrearCanalDto) {
    return this.prisma.channel.create({
      data: { provider: 'BAILEYS', name: dto.nombre, siteId: dto.siteId ?? null },
      select: { id: true, name: true, status: true },
    });
  }

  /**
   * El QR se sirve aparte y no en el listado: es efímero, pesa bastante como
   * data URL, y así queda claro que solo se pide cuando hay alguien delante
   * para escanearlo.
   */
  @RequirePermission('whatsapp.manage')
  @Get(':id/qr')
  async qr(@Param('id', ParseUUIDPipe) id: string) {
    const c = await this.prisma.channel.findUniqueOrThrow({
      where: { id },
      select: { qrCode: true, qrExpiresAt: true, status: true },
    });

    // Un QR vencido no se muestra: escanearlo falla y el usuario no entiende
    // por qué. Se devuelve null y la interfaz pide generar otro.
    const vigente = c.qrExpiresAt && c.qrExpiresAt.getTime() > Date.now();
    return { qr: vigente ? c.qrCode : null, status: c.status, expiraEn: c.qrExpiresAt };
  }

  @RequirePermission('whatsapp.manage')
  @Post(':id/conectar')
  async conectar(@Param('id', ParseUUIDPipe) id: string) {
    await this.prisma.channel.findUniqueOrThrow({ where: { id }, select: { id: true } });

    try {
      const r = await fetch(`${GATEWAY}/canales/${id}/conectar`, {
        method: 'POST',
        signal: AbortSignal.timeout(30_000),
      });
      if (!r.ok) throw new Error(`gateway ${r.status}: ${await r.text()}`);
      return { ok: true };
    } catch (e) {
      // Se distingue del error de la API a propósito: si el gateway está
      // caído, el problema no es el panel y quien lo lea debe saberlo.
      throw new BadGatewayException(
        `No responde el gateway de WhatsApp: ${(e as Error).message}`,
      );
    }
  }
}
