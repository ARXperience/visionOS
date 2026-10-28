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
exports.BillingService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../../prisma/prisma.service");
const audit_service_1 = require("../audit/audit.service");
const edades_1 = require("./edades");
const D = (n) => new client_1.Prisma.Decimal(n);
const CERO = D(0);
let BillingService = class BillingService {
    prisma;
    audit;
    constructor(prisma, audit) {
        this.prisma = prisma;
        this.audit = audit;
    }
    async siguienteNumero() {
        const anio = new Date().getUTCFullYear();
        const cuantas = await this.prisma.invoice.count({ where: { number: { startsWith: `FV-${anio}-` } } });
        return `FV-${anio}-${String(cuantas + 1).padStart(6, '0')}`;
    }
    async tarifa(serviceId, payerId, siteId) {
        const hoy = new Date();
        const vigentes = await this.prisma.servicePrice.findMany({
            where: {
                serviceId,
                validFrom: { lte: hoy },
                OR: [{ validTo: null }, { validTo: { gte: hoy } }],
            },
            select: { price: true, copay: true, payerId: true, siteId: true },
        });
        const puntaje = (p) => (p.payerId === payerId ? 2 : p.payerId === null && payerId === null ? 2 : 0) +
            (p.siteId === siteId ? 1 : 0);
        const mejor = vigentes
            .filter((p) => p.payerId === payerId || p.payerId === null)
            .sort((a, b) => puntaje(b) - puntaje(a))[0];
        return mejor ?? null;
    }
    async crear(datos, ctx) {
        const f = await this.prisma.invoice.create({
            data: {
                number: await this.siguienteNumero(),
                personId: datos.personId,
                siteId: datos.siteId,
                payerId: datos.payerId,
                notes: datos.notes?.trim(),
                createdById: ctx.actor.id,
            },
            select: { id: true, number: true, status: true },
        });
        await this.audit.record({
            userId: ctx.actor.id,
            action: 'CREATE',
            entityType: 'invoice',
            entityId: f.id,
            personId: datos.personId,
            siteId: datos.siteId,
            newValues: { numero: f.number },
            ipAddress: ctx.ip,
        });
        return f;
    }
    async agregarItem(invoiceId, datos, ctx) {
        const f = await this.prisma.invoice.findUnique({
            where: { id: invoiceId },
            select: { id: true, status: true, personId: true, payerId: true, siteId: true },
        });
        if (!f)
            throw new common_1.NotFoundException('Factura no encontrada');
        if (f.status !== 'BORRADOR') {
            throw new common_1.BadRequestException('Solo se modifican facturas en borrador. Una factura emitida se anula y se hace otra.');
        }
        const servicio = await this.prisma.service.findUnique({
            where: { id: datos.serviceId },
            select: { id: true, name: true, cupsCode: true },
        });
        if (!servicio)
            throw new common_1.NotFoundException('Servicio no encontrado');
        const tarifa = await this.tarifa(datos.serviceId, f.payerId, f.siteId);
        const precio = datos.unitPrice !== undefined ? D(datos.unitPrice) : (tarifa?.price ?? null);
        if (precio === null) {
            throw new common_1.BadRequestException(`No hay tarifa vigente para "${servicio.name}" con ese pagador. Indique el valor o cargue la tarifa.`);
        }
        const cantidad = datos.quantity ?? 1;
        const descuento = D(datos.discount ?? 0);
        const total = precio.mul(cantidad).minus(descuento);
        if (total.lessThan(CERO)) {
            throw new common_1.BadRequestException('El descuento no puede superar el valor de la línea.');
        }
        return this.prisma.$transaction(async (tx) => {
            const item = await tx.invoiceItem.create({
                data: {
                    invoiceId,
                    serviceId: servicio.id,
                    appointmentId: datos.appointmentId,
                    cupsCode: servicio.cupsCode,
                    description: servicio.name,
                    quantity: cantidad,
                    unitPrice: precio,
                    discount: descuento,
                    total,
                },
                select: { id: true, description: true, total: true },
            });
            await this.recalcular(invoiceId, tarifa?.copay ?? null, tx);
            return item;
        });
    }
    async quitarItem(itemId, ctx) {
        const item = await this.prisma.invoiceItem.findUnique({
            where: { id: itemId },
            select: { invoiceId: true, invoice: { select: { status: true } } },
        });
        if (!item)
            throw new common_1.NotFoundException('Línea no encontrada');
        if (item.invoice.status !== 'BORRADOR') {
            throw new common_1.BadRequestException('Solo se modifican facturas en borrador.');
        }
        return this.prisma.$transaction(async (tx) => {
            await tx.invoiceItem.delete({ where: { id: itemId } });
            return this.recalcular(item.invoiceId, null, tx);
        });
    }
    async recalcular(invoiceId, copayUnitario, tx) {
        const items = await tx.invoiceItem.findMany({
            where: { invoiceId },
            select: { total: true, discount: true, quantity: true },
        });
        const subtotal = items.reduce((s, i) => s.plus(i.total).plus(i.discount), CERO);
        const descuento = items.reduce((s, i) => s.plus(i.discount), CERO);
        const total = subtotal.minus(descuento);
        const actual = await tx.invoice.findUniqueOrThrow({
            where: { id: invoiceId },
            select: { copay: true },
        });
        const copay = copayUnitario
            ? actual.copay.plus(copayUnitario.mul(items.at(-1)?.quantity ?? 1))
            : actual.copay;
        return tx.invoice.update({
            where: { id: invoiceId },
            data: { subtotal, discount: descuento, total, copay },
            select: { id: true, number: true, subtotal: true, discount: true, copay: true, total: true },
        });
    }
    async emitir(id, diasPlazo, ctx) {
        const f = await this.prisma.invoice.findUnique({
            where: { id },
            select: { id: true, status: true, total: true, personId: true, siteId: true, _count: { select: { items: true } } },
        });
        if (!f)
            throw new common_1.NotFoundException('Factura no encontrada');
        if (f.status !== 'BORRADOR')
            throw new common_1.BadRequestException('Ya fue emitida o anulada.');
        if (!f._count.items)
            throw new common_1.BadRequestException('Una factura sin líneas no se emite.');
        if (f.total.lessThanOrEqualTo(CERO)) {
            throw new common_1.BadRequestException('El total es cero: revise las tarifas antes de emitir.');
        }
        const vence = new Date();
        vence.setUTCDate(vence.getUTCDate() + diasPlazo);
        const emitida = await this.prisma.invoice.update({
            where: { id },
            data: { status: 'EMITIDA', issuedAt: new Date(), dueDate: vence },
            select: { id: true, number: true, status: true, total: true, dueDate: true },
        });
        await this.audit.record({
            userId: ctx.actor.id,
            action: 'UPDATE',
            entityType: 'invoice',
            entityId: id,
            personId: f.personId,
            siteId: f.siteId,
            newValues: { estado: 'EMITIDA', total: f.total.toString() },
            ipAddress: ctx.ip,
        });
        return emitida;
    }
    async anular(id, motivo, ctx) {
        const f = await this.prisma.invoice.findUnique({
            where: { id },
            select: { id: true, status: true, personId: true, _count: { select: { payments: true } } },
        });
        if (!f)
            throw new common_1.NotFoundException('Factura no encontrada');
        if (f.status === 'ANULADA')
            throw new common_1.BadRequestException('Ya está anulada.');
        if (f._count.payments > 0) {
            throw new common_1.ConflictException('Tiene pagos registrados. Reverse los pagos con una nota antes de anular.');
        }
        const anulada = await this.prisma.invoice.update({
            where: { id },
            data: { status: 'ANULADA', voidedAt: new Date(), voidReason: motivo.trim() },
            select: { id: true, number: true, status: true },
        });
        await this.audit.record({
            userId: ctx.actor.id,
            action: 'UPDATE',
            entityType: 'invoice',
            entityId: id,
            personId: f.personId,
            newValues: { estado: 'ANULADA', motivo },
            ipAddress: ctx.ip,
        });
        return anulada;
    }
    async registrarPago(invoiceId, datos, ctx) {
        const f = await this.prisma.invoice.findUnique({
            where: { id: invoiceId },
            select: {
                id: true,
                status: true,
                total: true,
                personId: true,
                siteId: true,
                payments: { select: { amount: true } },
            },
        });
        if (!f)
            throw new common_1.NotFoundException('Factura no encontrada');
        if (f.status === 'ANULADA')
            throw new common_1.BadRequestException('La factura está anulada.');
        if (f.status === 'BORRADOR')
            throw new common_1.BadRequestException('Emita la factura antes de cobrarla.');
        const monto = D(datos.amount);
        if (monto.equals(CERO))
            throw new common_1.BadRequestException('El pago no puede ser cero.');
        const pagado = f.payments.reduce((s, p) => s.plus(p.amount), CERO);
        const nuevoSaldo = f.total.minus(pagado).minus(monto);
        if (nuevoSaldo.lessThan(CERO)) {
            throw new common_1.BadRequestException(`Ese pago excede el saldo. Debe ${f.total.minus(pagado).toFixed(2)} y se intentó cobrar ${monto.toFixed(2)}.`);
        }
        const pago = await this.prisma.$transaction(async (tx) => {
            const p = await tx.payment.create({
                data: {
                    invoiceId,
                    amount: monto,
                    method: datos.method,
                    reference: datos.reference?.trim(),
                    notes: datos.notes?.trim(),
                    receivedById: ctx.actor.id,
                },
                select: { id: true, amount: true, method: true, receivedAt: true },
            });
            if (nuevoSaldo.equals(CERO)) {
                await tx.invoice.update({ where: { id: invoiceId }, data: { status: 'PAGADA' } });
            }
            return p;
        });
        await this.audit.record({
            userId: ctx.actor.id,
            action: 'CREATE',
            entityType: 'payment',
            entityId: pago.id,
            personId: f.personId,
            siteId: f.siteId,
            newValues: { monto: monto.toString(), medio: datos.method, saldo: nuevoSaldo.toString() },
            ipAddress: ctx.ip,
        });
        return { ...pago, saldo: nuevoSaldo };
    }
    async radicar(id, numero, ctx) {
        const f = await this.prisma.invoice.update({
            where: { id },
            data: { filedAt: new Date(), filedNumber: numero.trim() },
            select: { id: true, number: true, filedAt: true, filedNumber: true, personId: true },
        });
        await this.audit.record({
            userId: ctx.actor.id,
            action: 'UPDATE',
            entityType: 'invoice',
            entityId: id,
            personId: f.personId,
            newValues: { radicado: numero },
            ipAddress: ctx.ip,
        });
        return f;
    }
    async registrarGlosa(invoiceId, datos, ctx) {
        const f = await this.prisma.invoice.findUnique({
            where: { id: invoiceId },
            select: { total: true, personId: true },
        });
        if (!f)
            throw new common_1.NotFoundException('Factura no encontrada');
        const monto = D(datos.amount);
        if (monto.greaterThan(f.total)) {
            throw new common_1.BadRequestException('La glosa no puede superar el valor de la factura.');
        }
        const g = await this.prisma.glosa.create({
            data: { invoiceId, code: datos.code.trim(), reason: datos.reason.trim(), amount: monto, createdById: ctx.actor.id },
            select: { id: true, code: true, amount: true, status: true },
        });
        await this.audit.record({
            userId: ctx.actor.id,
            action: 'CREATE',
            entityType: 'glosa',
            entityId: g.id,
            personId: f.personId,
            newValues: { codigo: datos.code, monto: monto.toString() },
            ipAddress: ctx.ip,
        });
        return g;
    }
    async responderGlosa(id, datos, ctx) {
        const g = await this.prisma.glosa.findUnique({
            where: { id },
            select: { id: true, amount: true, answeredAt: true, invoice: { select: { personId: true } } },
        });
        if (!g)
            throw new common_1.NotFoundException('Glosa no encontrada');
        if (g.answeredAt)
            throw new common_1.BadRequestException('Ya fue respondida.');
        const aceptado = datos.acceptedAmount !== undefined ? D(datos.acceptedAmount) : CERO;
        if (aceptado.greaterThan(g.amount)) {
            throw new common_1.BadRequestException('No se puede aceptar más de lo glosado.');
        }
        const respondida = await this.prisma.glosa.update({
            where: { id },
            data: {
                answer: datos.answer.trim(),
                answeredAt: new Date(),
                acceptedAmount: aceptado,
                status: aceptado.equals(g.amount) ? 'ACEPTADA' : 'RESPONDIDA',
            },
            select: { id: true, status: true, acceptedAmount: true },
        });
        await this.audit.record({
            userId: ctx.actor.id,
            action: 'UPDATE',
            entityType: 'glosa',
            entityId: id,
            personId: g.invoice.personId,
            newValues: { aceptado: aceptado.toString(), recuperado: g.amount.minus(aceptado).toString() },
            ipAddress: ctx.ip,
        });
        return respondida;
    }
    async listar(filtro) {
        const facturas = await this.prisma.invoice.findMany({
            where: {
                ...(filtro.status ? { status: filtro.status } : {}),
                ...(filtro.personId ? { personId: filtro.personId } : {}),
                ...(filtro.payerId ? { payerId: filtro.payerId } : {}),
                ...(filtro.siteId ? { siteId: filtro.siteId } : {}),
            },
            orderBy: { createdAt: 'desc' },
            take: 200,
            select: {
                id: true,
                number: true,
                status: true,
                subtotal: true,
                discount: true,
                copay: true,
                total: true,
                issuedAt: true,
                dueDate: true,
                filedNumber: true,
                createdAt: true,
                person: { select: { id: true, displayName: true, docNumber: true } },
                payer: { select: { id: true, name: true } },
                site: { select: { code: true } },
                items: { select: { id: true, description: true, quantity: true, unitPrice: true, total: true } },
                payments: { select: { id: true, amount: true, method: true, receivedAt: true, reference: true } },
                glosas: { select: { id: true, code: true, reason: true, amount: true, status: true, acceptedAmount: true } },
            },
        });
        return facturas.map((f) => {
            const pagado = f.payments.reduce((s, p) => s.plus(p.amount), CERO);
            return { ...f, pagado, saldo: f.total.minus(pagado) };
        });
    }
    async cartera(payerId) {
        const pendientes = await this.prisma.invoice.findMany({
            where: {
                status: 'EMITIDA',
                ...(payerId ? { payerId } : {}),
            },
            select: {
                id: true,
                number: true,
                total: true,
                dueDate: true,
                issuedAt: true,
                payer: { select: { id: true, name: true } },
                person: { select: { displayName: true } },
                payments: { select: { amount: true } },
                glosas: { select: { amount: true, acceptedAmount: true, status: true } },
            },
        });
        const hoy = new Date();
        const tramos = { alDia: CERO, d1a30: CERO, d31a60: CERO, d61a90: CERO, mas90: CERO };
        const porPagador = new Map();
        let enGlosa = CERO;
        const detalle = [];
        for (const f of pendientes) {
            const pagado = f.payments.reduce((s, p) => s.plus(p.amount), CERO);
            const saldo = f.total.minus(pagado);
            if (saldo.lessThanOrEqualTo(CERO))
                continue;
            const dias = (0, edades_1.diasVencida)(f.dueDate, hoy);
            const tramo = (0, edades_1.tramoDe)(dias);
            tramos[tramo] = tramos[tramo].plus(saldo);
            enGlosa = enGlosa.plus(f.glosas
                .filter((g) => g.status === 'RECIBIDA' || g.status === 'RESPONDIDA')
                .reduce((s, g) => s.plus(g.amount), CERO));
            const clave = f.payer?.id ?? 'particular';
            const previo = porPagador.get(clave) ?? {
                nombre: f.payer?.name ?? 'Particular',
                saldo: CERO,
                facturas: 0,
            };
            porPagador.set(clave, { ...previo, saldo: previo.saldo.plus(saldo), facturas: previo.facturas + 1 });
            detalle.push({
                id: f.id,
                numero: f.number,
                pagador: f.payer?.name ?? 'Particular',
                paciente: f.person.displayName,
                saldo: saldo.toFixed(2),
                diasVencida: Math.max(0, dias),
            });
        }
        detalle.sort((a, b) => b.diasVencida - a.diasVencida);
        return {
            tramos: Object.fromEntries(Object.entries(tramos).map(([k, v]) => [k, v.toFixed(2)])),
            total: Object.values(tramos).reduce((s, v) => s.plus(v), CERO).toFixed(2),
            enGlosa: enGlosa.toFixed(2),
            porPagador: [...porPagador.values()]
                .map((p) => ({ ...p, saldo: p.saldo.toFixed(2) }))
                .sort((a, b) => Number(b.saldo) - Number(a.saldo)),
            detalle: detalle.slice(0, 100),
        };
    }
};
exports.BillingService = BillingService;
exports.BillingService = BillingService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService])
], BillingService);
//# sourceMappingURL=billing.service.js.map