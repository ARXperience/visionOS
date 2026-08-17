"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HERRAMIENTAS = void 0;
exports.ejecutar = ejecutar;
exports.HERRAMIENTAS = [
    {
        nombre: 'buscar_servicio',
        descripcion: 'Busca servicios de la clínica por nombre o por lo que el paciente describe. ' +
            'Devuelve nombre, duración y si requiere orden médica o autorización.',
        parametros: {
            type: 'object',
            properties: { texto: { type: 'string', description: 'Lo que busca el paciente' } },
            required: ['texto'],
        },
    },
    {
        nombre: 'consultar_disponibilidad',
        descripcion: 'Cupos libres de un servicio en una sede y fecha. Devuelve lista vacía si es ' +
            'festivo, si el profesional no atiende ese día o si no hay recurso libre.',
        parametros: {
            type: 'object',
            properties: {
                serviceId: { type: 'string' },
                siteId: { type: 'string' },
                fecha: { type: 'string', description: 'AAAA-MM-DD' },
            },
            required: ['serviceId', 'siteId', 'fecha'],
        },
    },
    {
        nombre: 'agendar_cita',
        descripcion: 'Agenda una cita en un cupo obtenido de consultar_disponibilidad. Falla si el ' +
            'cupo se ocupó mientras tanto: en ese caso hay que volver a consultar.',
        parametros: {
            type: 'object',
            properties: {
                personId: { type: 'string' },
                serviceId: { type: 'string' },
                siteId: { type: 'string' },
                professionalId: { type: 'string' },
                roomId: { type: 'string' },
                equipmentId: { type: 'string' },
                startsAt: { type: 'string', description: 'ISO 8601 con zona' },
            },
            required: ['personId', 'serviceId', 'siteId', 'professionalId', 'startsAt'],
        },
    },
    {
        nombre: 'reagendar_cita',
        descripcion: 'Cancela una cita existente y agenda otra en un cupo nuevo.',
        parametros: {
            type: 'object',
            properties: {
                appointmentId: { type: 'string' },
                nuevoInicio: { type: 'string' },
                professionalId: { type: 'string' },
            },
            required: ['appointmentId', 'nuevoInicio', 'professionalId'],
        },
    },
    {
        nombre: 'escalar_a_humano',
        descripcion: 'Pasa la conversación a una persona del equipo. Úsala ante cualquier síntoma, ' +
            'urgencia, queja, o cuando no estés seguro. Escalar de más no cuesta nada.',
        parametros: {
            type: 'object',
            properties: { motivo: { type: 'string' } },
            required: ['motivo'],
        },
    },
];
async function ejecutar(nombre, args, ctx) {
    switch (nombre) {
        case 'buscar_servicio': {
            const texto = String(args.texto ?? '');
            const servicios = await ctx.prisma.service.findMany({
                where: {
                    isActive: true,
                    isSchedulableOnline: true,
                    name: { contains: texto, mode: 'insensitive' },
                },
                take: 8,
                select: {
                    id: true,
                    name: true,
                    durationMin: true,
                    businessLine: true,
                    requiresReferral: true,
                    requiresAuthorization: true,
                    requiresDilation: true,
                },
            });
            return { servicios };
        }
        case 'consultar_disponibilidad': {
            const huecos = await ctx.disponibilidad.huecos({
                serviceId: String(args.serviceId),
                siteId: String(args.siteId),
                fecha: String(args.fecha),
            });
            return {
                cupos: huecos.slice(0, 10).map((h) => ({
                    inicio: h.inicio.toISOString(),
                    profesional: h.professionalName,
                    professionalId: h.professionalId,
                    roomId: h.roomId,
                    equipmentId: h.equipmentId,
                })),
                hay: huecos.length,
            };
        }
        case 'agendar_cita': {
            if (!ctx.personId)
                return { error: 'No se ha identificado al paciente' };
            try {
                const cita = await ctx.citas.crear({
                    siteId: String(args.siteId),
                    personId: ctx.personId,
                    serviceId: String(args.serviceId),
                    professionalId: String(args.professionalId),
                    roomId: args.roomId ? String(args.roomId) : null,
                    equipmentId: args.equipmentId ? String(args.equipmentId) : null,
                    startsAt: new Date(String(args.startsAt)),
                    createdVia: 'BAILEYS',
                }, { user: null });
                return { ok: true, codigo: cita.publicCode, inicio: cita.startsAt.toISOString() };
            }
            catch (e) {
                return { ok: false, error: e.message };
            }
        }
        case 'reagendar_cita':
            return { error: 'Reagendar por el asistente aún no está habilitado' };
        case 'escalar_a_humano':
            await ctx.prisma.conversation.update({
                where: { id: ctx.conversationId },
                data: { aiEnabled: false, status: 'PENDIENTE' },
            });
            return { escalado: true, motivo: String(args.motivo ?? '') };
        default:
            return { error: `Herramienta desconocida: ${nombre}` };
    }
}
//# sourceMappingURL=herramientas.js.map