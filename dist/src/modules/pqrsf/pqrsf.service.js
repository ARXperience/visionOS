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
exports.PqrsfService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const audit_service_1 = require("../audit/audit.service");
const DIAS_HABILES = {
    PETICION: 15,
    QUEJA: 15,
    RECLAMO: 15,
    SUGERENCIA: 15,
    FELICITACION: 30,
};
let PqrsfService = class PqrsfService {
    prisma;
    audit;
    constructor(prisma, audit) {
        this.prisma = prisma;
        this.audit = audit;
    }
    async vencimiento(desde, dias) {
        const festivos = new Set((await this.prisma.holiday.findMany({
            where: { date: { gte: desde, lte: new Date(desde.getTime() + 120 * 86_400_000) } },
            select: { date: true },
        })).map((f) => f.date.toISOString().slice(0, 10)));
        const fecha = new Date(desde);
        let restantes = dias;
        while (restantes > 0) {
            fecha.setUTCDate(fecha.getUTCDate() + 1);
            const dow = fecha.getUTCDay();
            const esFinDeSemana = dow === 0 || dow === 6;
            const esFestivo = festivos.has(fecha.toISOString().slice(0, 10));
            if (!esFinDeSemana && !esFestivo)
                restantes -= 1;
        }
        return fecha;
    }
    async siguienteRadicado() {
        const anio = new Date().getUTCFullYear();
        const cuantas = await this.prisma.pqrsf.count({
            where: { radicado: { startsWith: `PQR-${anio}-` } },
        });
        return `PQR-${anio}-${String(cuantas + 1).padStart(4, '0')}`;
    }
    async radicar(datos, ctx) {
        if (!datos.personId && !datos.contacto) {
            throw new common_1.BadRequestException('Indique el paciente o un dato de contacto: hay que poder responder dentro del plazo.');
        }
        const dueDate = await this.vencimiento(new Date(), DIAS_HABILES[datos.tipo]);
        const p = await this.prisma.pqrsf.create({
            data: {
                radicado: await this.siguienteRadicado(),
                tipo: datos.tipo,
                asunto: datos.asunto.trim(),
                detalle: datos.detalle.trim(),
                personId: datos.personId,
                nombre: datos.nombre?.trim(),
                contacto: datos.contacto?.trim(),
                siteId: datos.siteId,
                serviceId: datos.serviceId,
                dueDate,
                createdById: ctx.actor.id,
            },
            select: { id: true, radicado: true, dueDate: true, tipo: true },
        });
        await this.audit.record({
            userId: ctx.actor.id,
            action: 'CREATE',
            entityType: 'pqrsf',
            entityId: p.id,
            personId: datos.personId,
            newValues: { radicado: p.radicado, tipo: p.tipo },
            ipAddress: ctx.ip,
        });
        return p;
    }
    listar(filtro) {
        return this.prisma.pqrsf.findMany({
            where: {
                ...(filtro.estado ? { estado: filtro.estado } : {}),
                ...(filtro.personId ? { personId: filtro.personId } : {}),
                ...(filtro.vencidas
                    ? { dueDate: { lt: new Date() }, estado: { in: ['RADICADA', 'EN_GESTION'] } }
                    : {}),
            },
            orderBy: [{ estado: 'asc' }, { dueDate: 'asc' }],
            take: 200,
            select: {
                id: true,
                radicado: true,
                tipo: true,
                estado: true,
                asunto: true,
                detalle: true,
                contacto: true,
                nombre: true,
                dueDate: true,
                respuesta: true,
                respondedAt: true,
                satisfaccion: true,
                createdAt: true,
                person: { select: { id: true, displayName: true, phone: true } },
                site: { select: { code: true } },
                service: { select: { name: true } },
                assignedTo: { select: { firstName: true, lastName: true } },
            },
        });
    }
    async asignar(id, userId, ctx) {
        const p = await this.prisma.pqrsf.update({
            where: { id },
            data: { assignedToId: userId, estado: 'EN_GESTION' },
            select: { id: true, radicado: true, estado: true, personId: true },
        });
        await this.audit.record({
            userId: ctx.actor.id,
            action: 'UPDATE',
            entityType: 'pqrsf',
            entityId: id,
            personId: p.personId,
            newValues: { asignadaA: userId },
            ipAddress: ctx.ip,
        });
        return p;
    }
    async responder(id, respuesta, ctx) {
        const antes = await this.prisma.pqrsf.findUnique({
            where: { id },
            select: { personId: true, dueDate: true, respondedAt: true },
        });
        if (!antes)
            throw new common_1.NotFoundException('Radicado no encontrado');
        if (antes.respondedAt) {
            throw new common_1.BadRequestException('Ya tiene respuesta. Registre una nueva PQRSF si hay más.');
        }
        const ahora = new Date();
        const p = await this.prisma.pqrsf.update({
            where: { id },
            data: { respuesta: respuesta.trim(), respondedAt: ahora, estado: 'RESPONDIDA' },
            select: { id: true, radicado: true, estado: true, respondedAt: true, dueDate: true },
        });
        await this.audit.record({
            userId: ctx.actor.id,
            action: 'UPDATE',
            entityType: 'pqrsf',
            entityId: id,
            personId: antes.personId,
            newValues: {
                estado: 'RESPONDIDA',
                dentroDePlazo: ahora <= antes.dueDate,
            },
            ipAddress: ctx.ip,
        });
        return { ...p, dentroDePlazo: ahora <= antes.dueDate };
    }
    async cerrar(id, satisfaccion, ctx) {
        const p = await this.prisma.pqrsf.update({
            where: { id },
            data: { estado: 'CERRADA', closedAt: new Date(), satisfaccion },
            select: { id: true, radicado: true, estado: true, personId: true },
        });
        await this.audit.record({
            userId: ctx.actor.id,
            action: 'UPDATE',
            entityType: 'pqrsf',
            entityId: id,
            personId: p.personId,
            newValues: { estado: 'CERRADA', satisfaccion },
            ipAddress: ctx.ip,
        });
        return p;
    }
    async indicadores() {
        const [porTipo, porEstado, vencidas, respondidas] = await Promise.all([
            this.prisma.pqrsf.groupBy({ by: ['tipo'], _count: true }),
            this.prisma.pqrsf.groupBy({ by: ['estado'], _count: true }),
            this.prisma.pqrsf.count({
                where: { dueDate: { lt: new Date() }, estado: { in: ['RADICADA', 'EN_GESTION'] } },
            }),
            this.prisma.pqrsf.findMany({
                where: { respondedAt: { not: null } },
                select: { respondedAt: true, dueDate: true, satisfaccion: true },
            }),
        ]);
        const aTiempo = respondidas.filter((r) => r.respondedAt <= r.dueDate).length;
        const calificadas = respondidas.filter((r) => r.satisfaccion != null);
        return {
            porTipo: Object.fromEntries(porTipo.map((p) => [p.tipo, p._count])),
            porEstado: Object.fromEntries(porEstado.map((p) => [p.estado, p._count])),
            vencidasSinResponder: vencidas,
            respondidas: respondidas.length,
            dentroDePlazo: aTiempo,
            cumplimiento: respondidas.length ? Math.round((aTiempo / respondidas.length) * 100) : null,
            satisfaccionMedia: calificadas.length
                ? Number((calificadas.reduce((s, r) => s + r.satisfaccion, 0) / calificadas.length).toFixed(1))
                : null,
        };
    }
};
exports.PqrsfService = PqrsfService;
exports.PqrsfService = PqrsfService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService])
], PqrsfService);
//# sourceMappingURL=pqrsf.service.js.map