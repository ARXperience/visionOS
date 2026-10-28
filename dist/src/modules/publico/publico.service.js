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
exports.PublicoService = void 0;
const common_1 = require("@nestjs/common");
const telefono_util_1 = require("../../common/utils/telefono.util");
const prisma_service_1 = require("../../prisma/prisma.service");
const audit_service_1 = require("../audit/audit.service");
const timeline_service_1 = require("../timeline/timeline.service");
const POLITICA = '2026-01';
const VENTANA_MS = 7 * 86_400_000;
let PublicoService = class PublicoService {
    prisma;
    audit;
    timeline;
    log = new common_1.Logger('Publico');
    constructor(prisma, audit, timeline) {
        this.prisma = prisma;
        this.audit = audit;
        this.timeline = timeline;
    }
    sedes() {
        return this.prisma.site.findMany({
            where: { isActive: true },
            orderBy: { code: 'asc' },
            select: { code: true, name: true, city: true, address: true, phone: true, openingHours: true },
        });
    }
    async servicios() {
        const filas = await this.prisma.service.findMany({
            where: { isActive: true, isSchedulableOnline: true },
            orderBy: [{ businessLine: 'asc' }, { name: 'asc' }],
            select: {
                slug: true,
                name: true,
                businessLine: true,
                durationMin: true,
                requiresReferral: true,
                requiresAuthorization: true,
                requiresDilation: true,
                requiresCompanion: true,
            },
        });
        const lineas = new Map();
        for (const f of filas) {
            const previas = lineas.get(f.businessLine) ?? [];
            previas.push(f);
            lineas.set(f.businessLine, previas);
        }
        return [...lineas.entries()].map(([linea, servicios]) => ({ linea, servicios }));
    }
    async solicitar(datos, ip, userAgent) {
        const telefono = (0, telefono_util_1.aE164Colombia)(datos.telefono);
        if (!telefono) {
            throw new common_1.BadRequestException('Revise el teléfono: escriba los diez dígitos, por ejemplo 310 514 9719.');
        }
        const nombre = datos.nombre.trim().replace(/\s+/g, ' ');
        const partes = nombre.split(' ');
        const correo = datos.correo?.trim().toLowerCase() || null;
        const [sede, servicio] = await Promise.all([
            datos.sede
                ? this.prisma.site.findFirst({
                    where: { code: datos.sede, isActive: true },
                    select: { id: true, name: true },
                })
                : null,
            datos.servicio
                ? this.prisma.service.findFirst({
                    where: { slug: datos.servicio, isActive: true },
                    select: { id: true, name: true },
                })
                : null,
        ]);
        const interes = [servicio?.name ?? 'Sin definir', datos.mensaje?.trim()]
            .filter(Boolean)
            .join(' — ')
            .slice(0, 1000);
        const { lead, personId, nuevaPersona } = await this.prisma.$transaction(async (tx) => {
            const existente = await tx.person.findFirst({
                where: { phone: telefono, deletedAt: null, mergedIntoId: null },
                select: { id: true, email: true },
            });
            const persona = existente ??
                (await tx.person.create({
                    data: {
                        firstName: partes[0],
                        firstSurname: partes.slice(1).join(' ') || null,
                        displayName: nombre,
                        phone: telefono,
                        email: correo,
                        tags: ['web'],
                    },
                    select: { id: true, email: true },
                }));
            if (correo && !persona.email) {
                await tx.person.update({ where: { id: persona.id }, data: { email: correo } });
            }
            await tx.dataConsent.create({
                data: {
                    personId: persona.id,
                    purpose: 'TRATAMIENTO_DATOS',
                    granted: true,
                    policyVersion: POLITICA,
                    channel: 'web',
                    evidenceText: 'Casilla de autorización marcada en el formulario del sitio público.',
                    ipAddress: ip,
                },
            });
            if (!existente) {
                await this.timeline.emitir({
                    personId: persona.id,
                    type: 'PRIMER_CONTACTO',
                    title: 'Dejó sus datos en el sitio web',
                    siteId: sede?.id ?? null,
                }, tx);
            }
            const abierto = await tx.lead.findFirst({
                where: {
                    personId: persona.id,
                    status: { notIn: ['PERDIDO', 'CONVERTIDO'] },
                    createdAt: { gt: new Date(Date.now() - VENTANA_MS) },
                },
                orderBy: { createdAt: 'desc' },
                select: { id: true },
            });
            if (abierto) {
                const l = await tx.lead.update({
                    where: { id: abierto.id },
                    data: {
                        interestText: interes,
                        ...(servicio ? { interestServiceId: servicio.id } : {}),
                        ...(sede ? { siteId: sede.id } : {}),
                    },
                    select: { id: true },
                });
                return { lead: l, personId: persona.id, nuevaPersona: !existente };
            }
            const l = await tx.lead.create({
                data: {
                    personId: persona.id,
                    status: 'NUEVO',
                    source: 'WEB',
                    siteId: sede?.id ?? null,
                    interestServiceId: servicio?.id ?? null,
                    interestText: interes,
                    metadata: { userAgent: userAgent?.slice(0, 200) ?? null },
                },
                select: { id: true },
            });
            await this.timeline.emitir({
                personId: persona.id,
                type: 'LEAD_CREADO',
                title: `Solicitud desde el sitio web: ${servicio?.name ?? 'sin definir'}`,
                siteId: sede?.id ?? null,
                refType: 'lead',
                refId: l.id,
            }, tx);
            return { lead: l, personId: persona.id, nuevaPersona: !existente };
        });
        await this.audit.record({
            action: 'CREATE',
            entityType: 'lead',
            entityId: lead.id,
            personId,
            newValues: { origen: 'sitio web', servicio: servicio?.name ?? null, sede: sede?.name ?? null },
            ipAddress: ip,
            userAgent,
        });
        this.log.log(`Solicitud web ${nuevaPersona ? '(persona nueva)' : '(persona conocida)'} -> lead ${lead.id}`);
        return {
            radicado: `VC-${lead.id.replace(/-/g, '').slice(0, 5).toUpperCase()}`,
            mensaje: 'Recibimos su solicitud. Un asesor se comunica con usted en horario hábil para confirmar día, hora y sede.',
        };
    }
};
exports.PublicoService = PublicoService;
exports.PublicoService = PublicoService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService,
        timeline_service_1.TimelineService])
], PublicoService);
//# sourceMappingURL=publico.service.js.map