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
exports.TreasuryService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../../prisma/prisma.service");
const audit_service_1 = require("../audit/audit.service");
const CERO = new client_1.Prisma.Decimal(0);
const D = (n) => new client_1.Prisma.Decimal(n);
const OFFSET_HORAS = 5;
function diaDe(instante) {
    return new Date(instante.getTime() - OFFSET_HORAS * 3_600_000).toISOString().slice(0, 10);
}
function ventanaDe(dia) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dia)) {
        throw new common_1.BadRequestException('La fecha debe venir como AAAA-MM-DD.');
    }
    const desde = new Date(`${dia}T00:00:00.000Z`).getTime() + OFFSET_HORAS * 3_600_000;
    return { dia, desde: new Date(desde), hasta: new Date(desde + 86_400_000 - 1) };
}
let TreasuryService = class TreasuryService {
    prisma;
    audit;
    constructor(prisma, audit) {
        this.prisma = prisma;
        this.audit = audit;
    }
    async esperado(siteId, dia) {
        const { desde, hasta } = ventanaDe(dia);
        const pagos = await this.prisma.payment.findMany({
            where: { receivedAt: { gte: desde, lte: hasta }, invoice: { siteId } },
            select: {
                amount: true,
                method: true,
                reference: true,
                receivedAt: true,
                invoice: { select: { number: true, person: { select: { displayName: true } } } },
            },
            orderBy: { receivedAt: 'asc' },
        });
        const por = (metodos) => pagos.filter((p) => metodos.includes(p.method)).reduce((s, p) => s.plus(p.amount), CERO);
        return {
            fecha: dia,
            efectivo: por(['EFECTIVO']),
            tarjeta: por(['TARJETA_DEBITO', 'TARJETA_CREDITO']),
            transferencia: por(['TRANSFERENCIA', 'PSE']),
            otros: por(['BONO', 'OTRO']),
            total: pagos.reduce((s, p) => s.plus(p.amount), CERO),
            movimientos: pagos.length,
            detalle: pagos.map((p) => ({
                hora: p.receivedAt.toISOString().slice(11, 16),
                factura: p.invoice.number,
                paciente: p.invoice.person.displayName,
                medio: p.method,
                referencia: p.reference,
                valor: p.amount.toFixed(2),
            })),
        };
    }
    async cerrar(datos, ctx) {
        const { dia } = ventanaDe(datos.fecha);
        const fechaDia = new Date(`${dia}T00:00:00.000Z`);
        const ya = await this.prisma.cashClose.findUnique({
            where: { siteId_date: { siteId: datos.siteId, date: fechaDia } },
            select: { id: true },
        });
        if (ya)
            throw new common_1.ConflictException(`La caja del ${dia} ya fue cerrada.`);
        if (dia > diaDe(new Date()))
            throw new common_1.BadRequestException('No se cierra una caja del futuro.');
        const e = await this.esperado(datos.siteId, dia);
        const contado = D(datos.countedCash);
        const base = D(datos.openingFloat ?? 0);
        const esperadoEnCaja = e.efectivo.plus(base);
        const diferencia = contado.minus(esperadoEnCaja);
        const cierre = await this.prisma.cashClose.create({
            data: {
                siteId: datos.siteId,
                date: fechaDia,
                expectedCash: esperadoEnCaja,
                countedCash: contado,
                difference: diferencia,
                expectedCard: e.tarjeta,
                expectedTransfer: e.transferencia,
                expectedOther: e.otros,
                openingFloat: base,
                notes: datos.notes?.trim(),
                closedById: ctx.actor.id,
            },
            select: {
                id: true,
                date: true,
                expectedCash: true,
                countedCash: true,
                difference: true,
            },
        });
        await this.audit.record({
            userId: ctx.actor.id,
            action: 'CREATE',
            entityType: 'cash_close',
            entityId: cierre.id,
            siteId: datos.siteId,
            newValues: {
                fecha: dia,
                esperado: esperadoEnCaja.toString(),
                contado: contado.toString(),
                diferencia: diferencia.toString(),
            },
            ipAddress: ctx.ip,
        });
        return {
            ...cierre,
            cuadra: diferencia.isZero(),
            mensaje: diferencia.isZero()
                ? 'La caja cuadra.'
                : diferencia.greaterThan(CERO)
                    ? `Sobran ${diferencia.toFixed(2)}. Revise si algún pago no se registró.`
                    : `Faltan ${diferencia.abs().toFixed(2)}. Revise los comprobantes del día.`,
        };
    }
    async historico(siteId, dias = 30) {
        const desde = new Date();
        desde.setUTCDate(desde.getUTCDate() - dias);
        const cierres = await this.prisma.cashClose.findMany({
            where: { date: { gte: desde }, ...(siteId ? { siteId } : {}) },
            orderBy: { date: 'desc' },
            select: {
                id: true,
                date: true,
                expectedCash: true,
                countedCash: true,
                difference: true,
                expectedCard: true,
                expectedTransfer: true,
                notes: true,
                site: { select: { code: true } },
                closedBy: { select: { firstName: true, lastName: true } },
            },
        });
        const descuadres = cierres.filter((c) => !c.difference.isZero());
        return {
            cierres,
            diasConDescuadre: descuadres.length,
            sumaDescuadres: descuadres.reduce((s, c) => s.plus(c.difference), CERO).toFixed(2),
            faltantes: descuadres
                .filter((c) => c.difference.lessThan(CERO))
                .reduce((s, c) => s.plus(c.difference.abs()), CERO)
                .toFixed(2),
        };
    }
    async sinCerrar(siteId) {
        const desde = new Date();
        desde.setUTCDate(desde.getUTCDate() - 60);
        const pagos = await this.prisma.payment.findMany({
            where: { receivedAt: { gte: desde }, ...(siteId ? { invoice: { siteId } } : {}) },
            select: { receivedAt: true, invoice: { select: { siteId: true, site: { select: { code: true } } } } },
        });
        const cierres = await this.prisma.cashClose.findMany({
            where: { date: { gte: desde }, ...(siteId ? { siteId } : {}) },
            select: { siteId: true, date: true },
        });
        const cerrados = new Set(cierres.map((c) => `${c.siteId}|${c.date.toISOString().slice(0, 10)}`));
        const hoy = diaDe(new Date());
        const pendientes = new Map();
        for (const p of pagos) {
            const dia = diaDe(p.receivedAt);
            if (dia === hoy)
                continue;
            const clave = `${p.invoice.siteId}|${dia}`;
            if (cerrados.has(clave))
                continue;
            pendientes.set(clave, { sede: p.invoice.site.code, fecha: dia, siteId: p.invoice.siteId });
        }
        return [...pendientes.values()].sort((a, b) => a.fecha.localeCompare(b.fecha));
    }
};
exports.TreasuryService = TreasuryService;
exports.TreasuryService = TreasuryService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService])
], TreasuryService);
//# sourceMappingURL=treasury.service.js.map