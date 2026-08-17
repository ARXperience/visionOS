"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const audit_service_1 = require("../audit/audit.service");
const storage_service_1 = require("../storage/storage.service");
let DocumentsService = class DocumentsService {
    prisma;
    audit;
    storage;
    constructor(prisma, audit, storage) {
        this.prisma = prisma;
        this.audit = audit;
        this.storage = storage;
    }
    async registrar(datos, ctx) {
        if (this.storage.habilitado)
            await this.storage.verificar(datos.fileUrl);
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
    async dePaciente(personId, ctx) {
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
    async abrir(id, ctx) {
        const d = await this.prisma.personDocument.findUnique({
            where: { id },
            select: { id: true, personId: true, fileUrl: true, fileName: true, title: true, archivedAt: true },
        });
        if (!d)
            throw new common_1.NotFoundException('Documento no encontrado');
        if (d.archivedAt)
            throw new common_1.BadRequestException('El documento está archivado.');
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
            throw new common_1.BadRequestException('El almacenamiento no está configurado en este servidor.');
        }
        return this.storage.firmarDescarga(d.fileUrl, d.fileName);
    }
    async archivar(id, motivo, ctx) {
        const d = await this.prisma.personDocument.findUnique({
            where: { id },
            select: { personId: true, title: true, archivedAt: true },
        });
        if (!d)
            throw new common_1.NotFoundException('Documento no encontrado');
        if (d.archivedAt)
            throw new common_1.BadRequestException('Ya está archivado.');
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
};
exports.DocumentsService = DocumentsService;
exports.DocumentsService = DocumentsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService,
        storage_service_1.StorageService])
], DocumentsService);
//# sourceMappingURL=documents.service.js.map