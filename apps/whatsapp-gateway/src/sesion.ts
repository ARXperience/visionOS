import { PrismaClient } from '@prisma/client';
import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
} from '@whiskeysockets/baileys';
import type { WASocket, proto } from '@whiskeysockets/baileys';
import type { Boom } from '@hapi/boom';
import pino from 'pino';
import { toDataURL } from 'qrcode';

import { authStateEnPostgres, type EstadoPersistido } from './auth-state.js';

const log = pino({ level: process.env.LOG_LEVEL ?? 'info' });

/** Sin esta pausa WhatsApp deja caer mensajes en silencio. Viene medida del ERP. */
const PAUSA_ESCRITURA_MS = 250;
const QR_VIGENCIA_MS = 60_000;

/** Reconexión con espera creciente: reintentar en bucle es lo que hace que cierren el número. */
const ESPERAS_MS = [2_000, 5_000, 15_000, 45_000, 120_000];

export interface Entrantes {
  onMensaje: (m: {
    channelId: string;
    externalId: string;
    de: string;
    nombre: string | null;
    texto: string | null;
    tipo: string;
    recibidoEn: Date;
  }) => Promise<void>;
}

export class Sesion {
  private sock: WASocket | null = null;
  private auth: EstadoPersistido | null = null;
  private intentos = 0;
  private cerrandoAposta = false;

  constructor(
    private readonly prisma: PrismaClient,
    private readonly channelId: string,
    private readonly clave: Buffer,
    private readonly eventos: Entrantes,
  ) {}

  async conectar(): Promise<void> {
    this.auth ??= await authStateEnPostgres(this.prisma, this.channelId, this.clave);
    const { version } = await fetchLatestBaileysVersion();

    await this.estado('CONECTANDO');

    this.sock = makeWASocket({
      version,
      auth: {
        creds: this.auth.state.creds,
        // La caché evita releer del blob en cada mensaje; sin ella el
        // rendimiento cae en cuanto hay varias conversaciones a la vez.
        keys: makeCacheableSignalKeyStore(this.auth.state.keys, log),
      },
      logger: log,
      // Marcarse en línea permanentemente es señal de bot. Además, con esto
      // en false WhatsApp entrega las notificaciones al teléfono del titular.
      markOnlineOnConnect: false,
      syncFullHistory: false,
      browser: ['Visión Colombia', 'Chrome', '1.0.0'],
    });

    this.sock.ev.on('creds.update', () => void this.auth?.guardar());
    this.sock.ev.on('connection.update', (u) => void this.alCambiarConexion(u));
    this.sock.ev.on('messages.upsert', (u) => void this.alLlegarMensajes(u));
  }

  private async alCambiarConexion(u: {
    connection?: string;
    lastDisconnect?: { error?: Error };
    qr?: string;
  }): Promise<void> {
    if (u.qr) {
      await this.prisma.channel.update({
        where: { id: this.channelId },
        data: {
          status: 'ESPERANDO_QR',
          qrCode: await toDataURL(u.qr),
          qrExpiresAt: new Date(Date.now() + QR_VIGENCIA_MS),
        },
      });
      log.info({ channelId: this.channelId }, 'QR listo para escanear');
    }

    if (u.connection === 'open') {
      this.intentos = 0;
      await this.prisma.channel.update({
        where: { id: this.channelId },
        data: {
          status: 'CONECTADO',
          qrCode: null,
          qrExpiresAt: null,
          lastConnectedAt: new Date(),
          lastError: null,
          phoneNumber: this.sock?.user?.id.split(':')[0] ?? undefined,
        },
      });
      log.info({ channelId: this.channelId, numero: this.sock?.user?.id }, 'Conectado');
    }

    if (u.connection === 'close') {
      const codigo = (u.lastDisconnect?.error as Boom | undefined)?.output?.statusCode;
      const motivo = u.lastDisconnect?.error?.message ?? 'desconocido';

      // loggedOut es el que hay que mirar: WhatsApp cerró la sesión. Puede
      // ser un cierre desde el teléfono o el síntoma de un baneo. En ningún
      // caso se reintenta solo — reconectar contra un número cerrado es
      // justo lo que empeora las cosas. Requiere una persona.
      if (codigo === DisconnectReason.loggedOut) {
        await this.estado('CERRADA_POR_WHATSAPP', motivo);
        log.error(
          { channelId: this.channelId, motivo },
          'SESIÓN CERRADA POR WHATSAPP — requiere intervención humana, no se reintenta',
        );
        return;
      }

      if (this.cerrandoAposta) return;

      const espera = ESPERAS_MS[Math.min(this.intentos, ESPERAS_MS.length - 1)];
      this.intentos += 1;
      await this.estado('DESCONECTADO', motivo);
      log.warn({ channelId: this.channelId, motivo, espera }, 'Caída; se reintenta');
      setTimeout(() => void this.conectar(), espera);
    }
  }

  private async alLlegarMensajes(u: {
    messages: proto.IWebMessageInfo[];
    type: string;
  }): Promise<void> {
    // 'append' es historial que Baileys reemite al reconectar. Procesarlo
    // haría que el asistente contestara conversaciones de hace días.
    if (u.type !== 'notify') return;

    for (const m of u.messages) {
      const clave = m.key;
      const jid = clave?.remoteJid;
      // Los propios y los de grupo no entran: la clínica atiende personas.
      if (!jid || clave?.fromMe || jid.endsWith('@g.us') || jid === 'status@broadcast') continue;

      const contenido = m.message ?? {};
      const texto =
        contenido.conversation ??
        contenido.extendedTextMessage?.text ??
        contenido.imageMessage?.caption ??
        contenido.videoMessage?.caption ??
        null;

      await this.eventos.onMensaje({
        channelId: this.channelId,
        externalId: clave?.id ?? `${jid}-${m.messageTimestamp}`,
        de: jid,
        nombre: m.pushName ?? null,
        texto,
        tipo: tipoDe(contenido),
        recibidoEn: new Date(Number(m.messageTimestamp ?? Date.now() / 1000) * 1000),
      });
    }
  }

  /**
   * Envía un texto imitando el ritmo de una persona: leer, escribir, enviar.
   *
   * No es un truco para engañar a nadie —si el paciente pregunta, el
   * asistente dice que es el asistente virtual de la clínica—: es que una
   * respuesta instantánea a cualquier hora es también el patrón que los
   * detectores de automatización buscan.
   */
  async enviarTexto(a: string, texto: string): Promise<string> {
    if (!this.sock) throw new Error('Sesión no conectada');

    await this.sock.presenceSubscribe(a);
    await this.sock.sendPresenceUpdate('composing', a);
    await pausa(PAUSA_ESCRITURA_MS);

    const r = await this.sock.sendMessage(a, { text: texto });
    await this.sock.sendPresenceUpdate('paused', a);

    if (!r?.key.id) throw new Error('WhatsApp no devolvió id del mensaje');
    return r.key.id;
  }

  async desconectar(): Promise<void> {
    this.cerrandoAposta = true;
    this.sock?.end(undefined);
    await this.estado('DESCONECTADO');
  }

  private estado(status: 'CONECTANDO' | 'CONECTADO' | 'DESCONECTADO' | 'CERRADA_POR_WHATSAPP' | 'ERROR', error?: string) {
    return this.prisma.channel.update({
      where: { id: this.channelId },
      data: { status, ...(error === undefined ? {} : { lastError: error.slice(0, 500) }) },
    });
  }
}

const pausa = (ms: number) => new Promise((r) => setTimeout(r, ms));

function tipoDe(c: proto.IMessage): string {
  if (c.imageMessage) return 'IMAGE';
  if (c.audioMessage) return 'AUDIO';
  if (c.videoMessage) return 'VIDEO';
  if (c.documentMessage) return 'DOCUMENT';
  if (c.stickerMessage) return 'STICKER';
  if (c.locationMessage) return 'LOCATION';
  if (c.contactMessage) return 'CONTACT';
  return 'TEXT';
}
