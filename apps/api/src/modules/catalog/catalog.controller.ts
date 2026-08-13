import { Controller, Get } from '@nestjs/common';

import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Catálogo de la clínica. Solo lectura por ahora: la edición entra cuando la
 * clínica haya revisado las duraciones conjeturadas y sepamos qué campos
 * necesita tocar de verdad.
 */
@Controller('catalogo')
export class CatalogController {
  constructor(private readonly prisma: PrismaService) {}

  @RequirePermission('service.read')
  @Get('servicios')
  servicios() {
    return this.prisma.service.findMany({
      where: { isActive: true },
      orderBy: [{ businessLine: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        code: true,
        name: true,
        slug: true,
        businessLine: true,
        durationMin: true,
        requiredModality: true,
        requiresReferral: true,
        requiresAuthorization: true,
        requiresDilation: true,
        cupsCode: true,
      },
    });
  }

  @RequirePermission('site.read')
  @Get('sedes')
  sedes() {
    return this.prisma.site.findMany({
      where: { isActive: true },
      orderBy: { code: 'asc' },
      select: { id: true, code: true, name: true, city: true, address: true, phone: true },
    });
  }
}
