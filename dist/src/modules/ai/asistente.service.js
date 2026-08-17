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
var AsistenteService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AsistenteService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const appointments_service_1 = require("../appointments/appointments.service");
const availability_service_1 = require("../appointments/availability.service");
const conversations_service_1 = require("../conversations/conversations.service");
const guardarrail_1 = require("./guardarrail");
const herramientas_1 = require("./herramientas");
let AsistenteService = AsistenteService_1 = class AsistenteService {
    prisma;
    conversaciones;
    citas;
    disponibilidad;
    logger = new common_1.Logger(AsistenteService_1.name);
    modo = (process.env.AI_MODO ?? 'COPILOTO').toUpperCase();
    presupuestoUsd = Number(process.env.AI_MONTHLY_BUDGET_USD ?? 60);
    constructor(prisma, conversaciones, citas, disponibilidad) {
        this.prisma = prisma;
        this.conversaciones = conversaciones;
        this.citas = citas;
        this.disponibilidad = disponibilidad;
    }
    get habilitado() {
        return Boolean(process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY);
    }
    async responder(conversationId, mensaje) {
        const conv = await this.prisma.conversation.findUnique({
            where: { id: conversationId },
            select: { id: true, personId: true, aiEnabled: true, siteId: true },
        });
        if (!conv || !conv.aiEnabled)
            return { accion: 'OMITIDO', motivo: 'La IA está pausada' };
        if ((0, guardarrail_1.preguntaSiEsBot)(mensaje)) {
            await this.conversaciones.enviarSistema(conversationId, guardarrail_1.RESPUESTA_SOY_ASISTENTE);
            return { accion: 'ENVIADO' };
        }
        const entrada = (0, guardarrail_1.exigeHumano)(mensaje);
        if (entrada.escalar)
            return this.escalar(conversationId, entrada.motivo);
        if (!this.habilitado) {
            return { accion: 'OMITIDO', motivo: 'Sin clave de proveedor de IA configurada' };
        }
        if (await this.presupuestoAgotado()) {
            return this.escalar(conversationId, 'Presupuesto mensual de IA agotado');
        }
        const inicio = Date.now();
        try {
            const { texto, tools, uso } = await this.llamar(mensaje, {
                conversationId,
                personId: conv.personId,
            });
            const salida = (0, guardarrail_1.puedeEnviarse)(texto);
            await this.registrar({
                conversationId,
                personId: conv.personId,
                entrada: mensaje,
                salida: texto,
                tools,
                uso,
                duracionMs: Date.now() - inicio,
                enviado: !salida.escalar && this.modo === 'AUTONOMO',
                escaladoMotivo: salida.escalar ? salida.motivo : undefined,
            });
            if (salida.escalar)
                return this.escalar(conversationId, salida.motivo);
            if (this.modo === 'AUTONOMO') {
                await this.conversaciones.enviarSistema(conversationId, texto);
                return { accion: 'ENVIADO' };
            }
            await this.conversaciones.enviar(conversationId, `Sugerencia del asistente:\n\n${texto}`, { user: null }, true);
            return { accion: 'SUGERIDO' };
        }
        catch (e) {
            this.logger.error(`Fallo del asistente: ${e.message}`);
            return this.escalar(conversationId, `Error del proveedor: ${e.message}`);
        }
    }
    async escalar(conversationId, motivo) {
        await this.prisma.conversation.update({
            where: { id: conversationId },
            data: { aiEnabled: false, status: 'PENDIENTE' },
        });
        await this.conversaciones.enviarSistema(conversationId, guardarrail_1.MENSAJE_ESCALADO);
        await this.conversaciones.enviar(conversationId, `El asistente escaló esta conversación: ${motivo}`, { user: null }, true);
        this.logger.log(`Escalado ${conversationId}: ${motivo}`);
        return { accion: 'ESCALADO', motivo };
    }
    async presupuestoAgotado() {
        const desde = new Date();
        desde.setUTCDate(1);
        desde.setUTCHours(0, 0, 0, 0);
        const { _sum } = await this.prisma.aiRun.aggregate({
            where: { createdAt: { gte: desde } },
            _sum: { costoUsd: true },
        });
        return Number(_sum.costoUsd ?? 0) >= this.presupuestoUsd;
    }
    async llamar(mensaje, ctx) {
        const prompt = await this.promptActivo();
        const modelo = process.env.AI_MODEL ?? 'gpt-4o-mini';
        const clave = process.env.OPENAI_API_KEY;
        const mensajes = [
            { role: 'system', content: prompt },
            { role: 'user', content: mensaje },
        ];
        const usadas = [];
        let entrada = 0;
        let salida = 0;
        for (let vuelta = 0; vuelta < 4; vuelta++) {
            const r = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: { authorization: `Bearer ${clave}`, 'content-type': 'application/json' },
                body: JSON.stringify({
                    model: modelo,
                    messages: mensajes,
                    tools: herramientas_1.HERRAMIENTAS.map((h) => ({
                        type: 'function',
                        function: { name: h.nombre, description: h.descripcion, parameters: h.parametros },
                    })),
                }),
                signal: AbortSignal.timeout(45_000),
            });
            if (!r.ok)
                throw new Error(`proveedor ${r.status}: ${(await r.text()).slice(0, 200)}`);
            const d = (await r.json());
            entrada += d.usage?.prompt_tokens ?? 0;
            salida += d.usage?.completion_tokens ?? 0;
            const msg = d.choices[0].message;
            if (!msg.tool_calls?.length) {
                return { texto: msg.content ?? '', tools: usadas, uso: { entrada, salida } };
            }
            mensajes.push(msg);
            for (const llamada of msg.tool_calls) {
                const args = JSON.parse(llamada.function.arguments || '{}');
                const resultado = await (0, herramientas_1.ejecutar)(llamada.function.name, args, {
                    prisma: this.prisma,
                    citas: this.citas,
                    disponibilidad: this.disponibilidad,
                    conversationId: ctx.conversationId,
                    personId: ctx.personId,
                });
                usadas.push({ nombre: llamada.function.name, args, resultado });
                mensajes.push({
                    role: 'tool',
                    tool_call_id: llamada.id,
                    content: JSON.stringify(resultado),
                });
            }
        }
        throw new Error('El asistente no llegó a una respuesta en cuatro vueltas');
    }
    async promptActivo() {
        const p = await this.prisma.aiPrompt.findFirst({
            where: { slug: 'atencion', isActive: true },
            select: { content: true },
        });
        if (!p)
            throw new Error('No hay prompt activo para "atencion"');
        return p.content;
    }
    async registrar(datos) {
        const costo = (datos.uso.entrada * 0.15 + datos.uso.salida * 0.6) / 1_000_000;
        await this.prisma.aiRun.create({
            data: {
                conversationId: datos.conversationId,
                personId: datos.personId,
                provider: 'openai',
                model: process.env.AI_MODEL ?? 'gpt-4o-mini',
                entrada: datos.entrada,
                salida: datos.salida,
                tools: datos.tools,
                tokensEntrada: datos.uso.entrada,
                tokensSalida: datos.uso.salida,
                costoUsd: costo,
                duracionMs: datos.duracionMs,
                enviado: datos.enviado,
                escaladoMotivo: datos.escaladoMotivo,
            },
        });
    }
};
exports.AsistenteService = AsistenteService;
exports.AsistenteService = AsistenteService = AsistenteService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        conversations_service_1.ConversationsService,
        appointments_service_1.AppointmentsService,
        availability_service_1.AvailabilityService])
], AsistenteService);
//# sourceMappingURL=asistente.service.js.map