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
exports.PortalService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const audit_service_1 = require("../audit/audit.service");
let PortalService = class PortalService {
    prisma;
    audit;
    log = new common_1.Logger('Portal');
    intentos = new Map();
    constructor(prisma, audit) {
        this.prisma = prisma;
        this.audit = audit;
    }
    frenar(ip) {
        const ahora = Date.now();
        const previo = this.intentos.get(ip);
        if (previo && previo.hasta > ahora && previo.n >= 10) {
            throw new common_1.BadRequestException('Demasiados intentos. Espere unos minutos.');
        }
        if (!previo || previo.hasta <= ahora) {
            this.intentos.set(ip, { n: 1, hasta: ahora + 600_000 });
        }
        else {
            previo.n += 1;
        }
        if (this.intentos.size > 5_000)
            this.intentos.clear();
    }
    async consultar(codigo, ultimos4, ip) {
        this.frenar(ip);
        const code = codigo.trim().toUpperCase();
        const cuatro = ultimos4.trim();
        if (!/^[A-Z0-9-]{5,12}$/.test(code) || !/^\d{4}$/.test(cuatro)) {
            throw new common_1.BadRequestException('Revise el código de la cita y los últimos cuatro dígitos de su documento.');
        }
        const cita = await this.prisma.appointment.findUnique({
            where: { publicCode: code },
            select: {
                id: true,
                publicCode: true,
                startsAt: true,
                status: true,
                laterality: true,
                person: { select: { id: true, docNumber: true, firstName: true } },
                service: { select: { name: true, preparationNotes: true, requiresDilation: true } },
                site: { select: { name: true, address: true, phone: true } },
            },
        });
        const noCoincide = !cita || !cita.person.docNumber?.endsWith(cuatro);
        if (noCoincide) {
            this.log.warn(`Consulta fallida de portal desde ${ip} para ${code}`);
            throw new common_1.NotFoundException('No encontramos una cita con esos datos.');
        }
        await this.audit.record({
            action: 'READ',
            entityType: 'portal',
            entityId: cita.id,
            personId: cita.person.id,
            newValues: { via: 'portal publico' },
            ipAddress: ip,
        });
        return {
            codigo: cita.publicCode,
            paciente: cita.person.firstName,
            cuando: cita.startsAt,
            estado: cita.status,
            servicio: cita.service.name,
            ojo: cita.laterality === 'NA' ? null : cita.laterality,
            preparacion: cita.service.preparationNotes,
            requiereDilatacion: cita.service.requiresDilation,
            sede: { nombre: cita.site.name, direccion: cita.site.address, telefono: cita.site.phone },
            puedeConfirmar: cita.status === 'PROGRAMADA',
            puedeCancelar: ['PROGRAMADA', 'CONFIRMADA'].includes(cita.status),
        };
    }
    async responder(codigo, ultimos4, accion, ip) {
        const cita = await this.consultar(codigo, ultimos4, ip);
        if (accion === 'confirmar' && !cita.puedeConfirmar) {
            throw new common_1.BadRequestException('Esa cita ya no se puede confirmar.');
        }
        if (accion === 'cancelar' && !cita.puedeCancelar) {
            throw new common_1.BadRequestException('Esa cita ya no se puede cancelar.');
        }
        const registro = await this.prisma.appointment.findUniqueOrThrow({
            where: { publicCode: cita.codigo },
            select: { id: true, personId: true, siteId: true, status: true },
        });
        const nuevo = accion === 'confirmar' ? 'CONFIRMADA' : 'CANCELADA';
        await this.prisma.$transaction(async (tx) => {
            await tx.appointment.update({ where: { id: registro.id }, data: { status: nuevo } });
            await tx.appointmentStatusEvent.create({
                data: {
                    appointmentId: registro.id,
                    fromStatus: registro.status,
                    toStatus: nuevo,
                    bySystem: 'portal',
                    reason: 'Acción del paciente desde el portal público',
                },
            });
            if (accion === 'cancelar') {
                await tx.resourceBooking.updateMany({
                    where: { appointmentId: registro.id },
                    data: { active: false },
                });
            }
        });
        await this.audit.record({
            action: 'UPDATE',
            entityType: 'appointment',
            entityId: registro.id,
            personId: registro.personId,
            siteId: registro.siteId,
            newValues: { estado: nuevo, via: 'portal publico' },
            ipAddress: ip,
        });
        return {
            codigo: cita.codigo,
            estado: nuevo,
            mensaje: accion === 'confirmar'
                ? 'Cita confirmada. Lo esperamos.'
                : 'Cita cancelada. Puede escribirnos por WhatsApp para tomar otra.',
        };
    }
};
exports.PortalService = PortalService;
exports.PortalService = PortalService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService])
], PortalService);
//# sourceMappingURL=portal.service.js.map