import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Req } from '@nestjs/common';
import type { PersonDocumentKind, User } from '@prisma/client';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import type { Request } from 'express';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { DocumentsService } from './documents.service';

const TIPOS = [
  'DOCUMENTO_IDENTIDAD',
  'AUTORIZACION',
  'ORDEN_MEDICA',
  'CONSENTIMIENTO',
  'HISTORIA_EXTERNA',
  'SOPORTE_PAGO',
  'OTRO',
] as const;

class DocumentoDto {
  @IsIn(TIPOS as unknown as string[]) kind!: PersonDocumentKind;
  @IsString() @MinLength(2) @MaxLength(160) title!: string;
  @IsString() @MaxLength(500) fileUrl!: string;
  @IsString() @MaxLength(200) fileName!: string;
  @IsString() @MaxLength(100) mimeType!: string;
  @IsInt() @Min(1) sizeBytes!: number;
  @IsString() @Matches(/^[a-f0-9]{64}$/i) sha256!: string;
  @IsOptional() @IsDateString() expiresAt?: string;
}

class ArchivarDto {
  @IsString() @MinLength(5) @MaxLength(300) motivo!: string;
}

@Controller('documentos')
export class DocumentsController {
  constructor(private readonly documentos: DocumentsService) {}

  private ctx(user: User, req: Request) {
    return { actor: user, ip: req.ip };
  }

  @Get('paciente/:personId')
  @RequirePermission('patient.read')
  dePaciente(
    @Param('personId', ParseUUIDPipe) personId: string,
    @CurrentUser() user: User,
    @Req() req: Request,
  ) {
    return this.documentos.dePaciente(personId, this.ctx(user, req));
  }

  @Post('paciente/:personId')
  @RequirePermission('patient.write')
  registrar(
    @Param('personId', ParseUUIDPipe) personId: string,
    @Body() dto: DocumentoDto,
    @CurrentUser() user: User,
    @Req() req: Request,
  ) {
    return this.documentos.registrar(
      { ...dto, personId, expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined },
      this.ctx(user, req),
    );
  }

  /** Abrirlo es leer la ficha: se audita antes de entregar el enlace. */
  @Get(':id/abrir')
  @RequirePermission('patient.read')
  abrir(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User, @Req() req: Request) {
    return this.documentos.abrir(id, this.ctx(user, req));
  }

  @Post(':id/archivar')
  @RequirePermission('patient.write')
  archivar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ArchivarDto,
    @CurrentUser() user: User,
    @Req() req: Request,
  ) {
    return this.documentos.archivar(id, dto.motivo, this.ctx(user, req));
  }
}
