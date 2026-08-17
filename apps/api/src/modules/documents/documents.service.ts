import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { PersonDocumentKind, User } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { StorageService } from '../storage/storage.service';

interface Ctx {
  actor: User;
  ip?: string | null;
}

/**
 * Documentos del paciente.
 *
 * Los resultados de examen viven en ServiceResult y los consentimientos
 * quirúrgicos en Surgery: aquellos tienen reglas propias y no se duplican
 * aquí. Esto es para lo demás —la copia de la cédula, la autorización de la
 * EPS, la orden que el paciente trajo en papel— que hoy vive en una carpeta
 * compartida sin auditoría de quién la abrió.
 */
@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly storage: StorageService,
  ) {}

  async registrar(
    datos: {
      personId: string;
      kind: PersonDocumentKind;
      title: string;
      fileUrl: string;
      fileName: string;
      mimeType: string;
      sizeBytes: number;
      sha256: string;
      expiresAt?: Date;
    },
    ctx: Ctx,
  ) {
    // Se comprueba que el archivo llegó de verdad antes de crear la fila. Al
    // revés, un fallo de red deja la ficha del paciente apuntando a nada y el
    // error aparece meses después, cuando alguien lo va a abrir.
    if (this.storage.habilitado) await this.storage.verificar(datos.fileUrl);

    const d = await this.prisma.personDocument.create({
      data: { ...datos, title: datos.title.trim(), uploadedById: ctx.actor.id },
      select: { id: true, title: true, kind: true, createdAt: true },
    });

    await this.audit.record({
      userId: ctx.actor.id,
      action: 'CREATE',
      entityType: 'person_document',
      entityId: d.id,
      personId: datos.personId,
      newValues: { tipo: datos.kind, titulo: d.title, sha256: datos.sha256 },
      ipAddress: ctx.ip,
    });

    return d;
  }

  /** Listar los documentos de un paciente ya es acceder a su ficha. */
  async dePaciente(personId: string, ctx: Ctx) {
    const documentos = await this.prisma.personDocument.findMany({
      where: { personId, archivedAt: null },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        kind: true,
        title: true,
        fileName: true,
        mimeType: true,
        sizeBytes: true,
        sha256: true,
        expiresAt: true,
        createdAt: true,
        uploadedBy: { select: { firstName: true, lastName: true } },
      },
    });

    await this.audit.record({
      userId: ctx.actor.id,
      action: 'READ',
      entityType: 'person_document',
      personId,
      newValues: { documentos: documentos.length },
      ipAddress: ctx.ip,
    });

    const hoy = new Date();
    return documentos.map((d) => ({
      ...d,
      vencido: Boolean(d.expiresAt && d.expiresAt < hoy),
    }));
  }

  /**
   * Abre un documento. Se firma aquí, desde el registro que sabe de qué
   * paciente es, y la lectura queda auditada antes de entregar el enlace.
   */
  async abrir(id: string, ctx: Ctx) {
    const d = await this.prisma.personDocument.findUnique({
      where: { id },
      select: { id: true, personId: true, fileUrl: true, fileName: true, title: true, archivedAt: true },
    });
    if (!d) throw new NotFoundException('Documento no encontrado');
    if (d.archivedAt) throw new BadRequestException('El documento está archivado.');

    await this.audit.record({
      userId: ctx.actor.id,
      action: 'EXPORT',
      entityType: 'person_document',
      entityId: id,
      personId: d.personId,
      newValues: { titulo: d.title },
      ipAddress: ctx.ip,
    });

    if (!this.storage.habilitado) {
      throw new BadRequestException('El almacenamiento no está configurado en este servidor.');
    }

    return this.storage.firmarDescarga(d.fileUrl, d.fileName);
  }

  /**
   * Archiva. No borra.
   *
   * Bajo la Res. 1995 un documento clínico se conserva quince años. Un botón
   * de borrar aquí es una infracción esperando a que alguien limpie la ficha.
   */
  async archivar(id: string, motivo: string, ctx: Ctx) {
    const d = await this.prisma.personDocument.findUnique({
      where: { id },
      select: { personId: true, title: true, archivedAt: true },
    });
    if (!d) throw new NotFoundException('Documento no encontrado');
    if (d.archivedAt) throw new BadRequestException('Ya está archivado.');

    await this.prisma.personDocument.update({
      where: { id },
      data: { archivedAt: new Date(), archivedReason: motivo.trim() },
    });

    await this.audit.record({
      userId: ctx.actor.id,
      action: 'UPDATE',
      entityType: 'person_document',
      entityId: id,
      personId: d.personId,
      newValues: { archivado: true, motivo },
      ipAddress: ctx.ip,
    });

    return { ok: true };
  }
}
