import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, Req } from '@nestjs/common';
import type { User } from '@prisma/client';
import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import type { Request } from 'express';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { PatientsService } from './patients.service';

const DOCS = ['CC', 'TI', 'CE', 'PA', 'RC', 'NIT', 'MS', 'AS', 'PE', 'PT', 'CN', 'SC', 'DE'] as const;

class BuscarOCrearDto {
  @IsString()
  @MinLength(4)
  @MaxLength(20)
  documento!: string;

  @IsOptional() @IsIn(DOCS as unknown as string[]) tipoDocumento?: (typeof DOCS)[number];
  @IsOptional() @IsString() @MaxLength(80) nombre?: string;
  @IsOptional() @IsString() @MaxLength(80) apellido?: string;
  @IsOptional() @IsString() @MaxLength(20) telefono?: string;
}

@Controller('pacientes')
export class PatientsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly pacientes: PatientsService,
  ) {}

  /**
   * Búsqueda para el mostrador: por nombre o por documento.
   *
   * Es global y no por sede a propósito —un paciente de Teusaquillo puede
   * llegar a Ibagué—, y por eso mismo queda auditada: lo que contiene el
   * acceso no es un filtro, es el registro de quién buscó qué.
   */
  @RequirePermission('patient.read')
  @Get('buscar')
  async buscar(@Query('q') q: string, @CurrentUser() user: User, @Req() req: Request) {
    const termino = (q ?? '').trim();
    if (termino.length < 3) return [];

    const personas = await this.prisma.person.findMany({
      where: {
        deletedAt: null,
        mergedIntoId: null,
        OR: [
          { displayName: { contains: termino, mode: 'insensitive' } },
          { docNumber: { startsWith: termino } },
          { phone: { contains: termino } },
        ],
      },
      take: 20,
      orderBy: { displayName: 'asc' },
      select: {
        id: true,
        displayName: true,
        docType: true,
        docNumber: true,
        phone: true,
        isPatient: true,
      },
    });

    await this.audit.record({
      userId: user.id,
      action: 'READ',
      entityType: 'person',
      // En una búsqueda se registra QUÉ se buscó y cuántos volvieron: sin
      // eso, exportar el padrón entero a mano se ve igual que atender a uno.
      newValues: { busqueda: termino, resultados: personas.length },
      ipAddress: req.ip ?? null,
    });

    return personas;
  }

  /**
   * El mostrador escribe un documento y sigue. Si la persona ya existe —muy
   * probable: pudo escribir antes por WhatsApp— se reutiliza en vez de crear
   * un duplicado que después habría que fusionar.
   */
  @RequirePermission('patient.write')
  @Post('buscar-o-crear')
  async buscarOCrear(@Body() dto: BuscarOCrearDto, @CurrentUser() user: User, @Req() req: Request) {
    const tipo = dto.tipoDocumento ?? 'CC';

    const existente = await this.prisma.person.findFirst({
      where: { docType: tipo, docNumber: dto.documento, deletedAt: null },
      select: { id: true, displayName: true, isPatient: true },
    });
    if (existente) return existente;

    const nombre = dto.nombre?.trim() || 'Paciente';
    const apellido = dto.apellido?.trim() ?? '';

    const creada = await this.prisma.person.create({
      data: {
        docType: tipo,
        docNumber: dto.documento,
        firstName: nombre,
        firstSurname: apellido || null,
        displayName: `${nombre} ${apellido}`.trim(),
        phone: dto.telefono ?? null,
      },
      select: { id: true, displayName: true, isPatient: true },
    });

    await this.audit.record({
      userId: user.id,
      action: 'CREATE',
      entityType: 'person',
      entityId: creada.id,
      personId: creada.id,
      ipAddress: req.ip ?? null,
    });

    return creada;
  }

  /**
   * Ficha completa con el recorrido: el Paciente 360.
   *
   * Va la ÚLTIMA a propósito. Nest resuelve las rutas por orden de
   * declaración, así que un ':id' declarado antes se tragaría
   * /pacientes/buscar — y con ParseUUIDPipe daría un 400 incomprensible
   * en vez de buscar.
   */
  @RequirePermission('patient.read')
  @Get(':id')
  ficha(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User, @Req() req: Request) {
    return this.pacientes.ficha(id, {
      user,
      ip: req.ip ?? null,
      userAgent: req.headers['user-agent'] ?? null,
    });
  }
}
