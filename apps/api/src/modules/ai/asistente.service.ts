import { Injectable, Logger } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';
import { AppointmentsService } from '../appointments/appointments.service';
import { AvailabilityService } from '../appointments/availability.service';
import { ConversationsService } from '../conversations/conversations.service';
import {
  MENSAJE_ESCALADO,
  RESPUESTA_SOY_ASISTENTE,
  exigeHumano,
  preguntaSiEsBot,
  puedeEnviarse,
} from './guardarrail';
import { HERRAMIENTAS, ejecutar } from './herramientas';

/**
 * El asistente de la clínica.
 *
 * Dos modos, y el orden importa:
 *
 *  - COPILOTO: redacta y deja la sugerencia como nota interna. Una persona
 *    la envía o la corrige. Es el modo con el que se arranca.
 *  - AUTONOMO: responde solo.
 *
 * El paso de uno a otro NO es una decisión de gusto: se mide qué porcentaje
 * de sugerencias se envían sin editar sobre 100 conversaciones reales, y por
 * debajo del 60% no se activa el autónomo — se itera el prompt, que por eso
 * vive en la base y se versiona.
 */
@Injectable()
export class AsistenteService {
  private readonly logger = new Logger(AsistenteService.name);
  private readonly modo = (process.env.AI_MODO ?? 'COPILOTO').toUpperCase();
  private readonly presupuestoUsd = Number(process.env.AI_MONTHLY_BUDGET_USD ?? 60);

  constructor(
    private readonly prisma: PrismaService,
    private readonly conversaciones: ConversationsService,
    private readonly citas: AppointmentsService,
    private readonly disponibilidad: AvailabilityService,
  ) {}

  get habilitado(): boolean {
    return Boolean(process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY);
  }

  /**
   * Responde a un mensaje entrante. Devuelve lo que hizo, para que quien
   * llame pueda registrarlo.
   */
  async responder(conversationId: string, mensaje: string): Promise<
    { accion: 'ESCALADO' | 'SUGERIDO' | 'ENVIADO' | 'OMITIDO'; motivo?: string }
  > {
    const conv = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { id: true, personId: true, aiEnabled: true, siteId: true },
    });
    if (!conv || !conv.aiEnabled) return { accion: 'OMITIDO', motivo: 'La IA está pausada' };

    // 1. Si preguntan qué es, se dice. Sonar humano no es mentir sobre serlo.
    if (preguntaSiEsBot(mensaje)) {
      await this.conversaciones.enviarSistema(conversationId, RESPUESTA_SOY_ASISTENTE);
      return { accion: 'ENVIADO' };
    }

    // 2. Guardarraíl de ENTRADA, antes de gastar una llamada. Si hay
    //    síntoma, el modelo ni siquiera ve el mensaje: no puede contestar
    //    algo que nadie revisó.
    const entrada = exigeHumano(mensaje);
    if (entrada.escalar) return this.escalar(conversationId, entrada.motivo!);

    if (!this.habilitado) {
      return { accion: 'OMITIDO', motivo: 'Sin clave de proveedor de IA configurada' };
    }

    if (await this.presupuestoAgotado()) {
      // Degrada a humano en vez de reventar la tarjeta.
      return this.escalar(conversationId, 'Presupuesto mensual de IA agotado');
    }

    const inicio = Date.now();
    try {
      const { texto, tools, uso } = await this.llamar(mensaje, {
        conversationId,
        personId: conv.personId,
      });

      // 3. Guardarraíl de SALIDA. Corre siempre, incluso si el mensaje
      //    entrante parecía inocente: "¿cuánto cuesta?" puede terminar en
      //    una respuesta que opine sobre un síntoma dicho de pasada.
      const salida = puedeEnviarse(texto);

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

      if (salida.escalar) return this.escalar(conversationId, salida.motivo!);

      if (this.modo === 'AUTONOMO') {
        await this.conversaciones.enviarSistema(conversationId, texto);
        return { accion: 'ENVIADO' };
      }

      // COPILOTO: la sugerencia entra como nota interna. El paciente no la
      // ve; una persona la envía o la corrige.
      await this.conversaciones.enviar(
        conversationId,
        `Sugerencia del asistente:\n\n${texto}`,
        { user: null },
        true,
      );
      return { accion: 'SUGERIDO' };
    } catch (e) {
      this.logger.error(`Fallo del asistente: ${(e as Error).message}`);
      return this.escalar(conversationId, `Error del proveedor: ${(e as Error).message}`);
    }
  }

  private async escalar(conversationId: string, motivo: string) {
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { aiEnabled: false, status: 'PENDIENTE' },
    });
    await this.conversaciones.enviarSistema(conversationId, MENSAJE_ESCALADO);
    // Nota interna con el porqué: quien tome la conversación tiene que saber
    // que no llega de la nada.
    await this.conversaciones.enviar(
      conversationId,
      `El asistente escaló esta conversación: ${motivo}`,
      { user: null },
      true,
    );
    this.logger.log(`Escalado ${conversationId}: ${motivo}`);
    return { accion: 'ESCALADO' as const, motivo };
  }

  /** Gasto del mes en curso contra el tope configurado. */
  private async presupuestoAgotado(): Promise<boolean> {
    const desde = new Date();
    desde.setUTCDate(1);
    desde.setUTCHours(0, 0, 0, 0);

    const { _sum } = await this.prisma.aiRun.aggregate({
      where: { createdAt: { gte: desde } },
      _sum: { costoUsd: true },
    });
    return Number(_sum.costoUsd ?? 0) >= this.presupuestoUsd;
  }

  /**
   * Llamada al proveedor con bucle de herramientas.
   *
   * Se escribe contra la API de OpenAI porque es la que la clínica tiene
   * configurada por defecto. El punto de cambio para Gemini es esta función
   * y nada más: el guardarraíl, las herramientas y el registro son comunes.
   */
  private async llamar(
    mensaje: string,
    ctx: { conversationId: string; personId: string | null },
  ): Promise<{ texto: string; tools: unknown[]; uso: { entrada: number; salida: number } }> {
    const prompt = await this.promptActivo();
    const modelo = process.env.AI_MODEL ?? 'gpt-4o-mini';
    const clave = process.env.OPENAI_API_KEY;

    const mensajes: Record<string, unknown>[] = [
      { role: 'system', content: prompt },
      { role: 'user', content: mensaje },
    ];
    const usadas: unknown[] = [];
    let entrada = 0;
    let salida = 0;

    // Tope de vueltas: sin él, un modelo que insiste en llamar herramientas
    // gira indefinidamente y el paciente no recibe nada.
    for (let vuelta = 0; vuelta < 4; vuelta++) {
      const r = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { authorization: `Bearer ${clave}`, 'content-type': 'application/json' },
        body: JSON.stringify({
          model: modelo,
          messages: mensajes,
          tools: HERRAMIENTAS.map((h) => ({
            type: 'function',
            function: { name: h.nombre, description: h.descripcion, parameters: h.parametros },
          })),
        }),
        signal: AbortSignal.timeout(45_000),
      });

      if (!r.ok) throw new Error(`proveedor ${r.status}: ${(await r.text()).slice(0, 200)}`);

      const d = (await r.json()) as {
        choices: { message: { content: string | null; tool_calls?: { id: string; function: { name: string; arguments: string } }[] } }[];
        usage?: { prompt_tokens: number; completion_tokens: number };
      };

      entrada += d.usage?.prompt_tokens ?? 0;
      salida += d.usage?.completion_tokens ?? 0;

      const msg = d.choices[0].message;
      if (!msg.tool_calls?.length) {
        return { texto: msg.content ?? '', tools: usadas, uso: { entrada, salida } };
      }

      mensajes.push(msg as unknown as Record<string, unknown>);
      for (const llamada of msg.tool_calls) {
        const args = JSON.parse(llamada.function.arguments || '{}') as Record<string, unknown>;
        const resultado = await ejecutar(llamada.function.name, args, {
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

  private async promptActivo(): Promise<string> {
    const p = await this.prisma.aiPrompt.findFirst({
      where: { slug: 'atencion', isActive: true },
      select: { content: true },
    });
    if (!p) throw new Error('No hay prompt activo para "atencion"');
    return p.content;
  }

  private async registrar(datos: {
    conversationId: string;
    personId: string | null;
    entrada: string;
    salida: string;
    tools: unknown[];
    uso: { entrada: number; salida: number };
    duracionMs: number;
    enviado: boolean;
    escaladoMotivo?: string;
  }) {
    // Precio de gpt-4o-mini por millón de tokens. Si cambia el modelo hay que
    // cambiarlo aquí: una cifra de coste desactualizada es peor que ninguna,
    // porque el corte de presupuesto deja de funcionar sin avisar.
    const costo = (datos.uso.entrada * 0.15 + datos.uso.salida * 0.6) / 1_000_000;

    await this.prisma.aiRun.create({
      data: {
        conversationId: datos.conversationId,
        personId: datos.personId,
        provider: 'openai',
        model: process.env.AI_MODEL ?? 'gpt-4o-mini',
        entrada: datos.entrada,
        salida: datos.salida,
        tools: datos.tools as never,
        tokensEntrada: datos.uso.entrada,
        tokensSalida: datos.uso.salida,
        costoUsd: costo,
        duracionMs: datos.duracionMs,
        enviado: datos.enviado,
        escaladoMotivo: datos.escaladoMotivo,
      },
    });
  }
}
