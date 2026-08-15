import { PrismaClient } from '@prisma/client';
import { existsSync, readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { join } from 'node:path';

import { claveDesdeEntorno } from './cifrado.js';
import { Sesion } from './sesion.js';
import { guardarEntrante } from './entrada.js';

/**
 * Gateway de WhatsApp — proceso APARTE del API.
 *
 * Está separado por una razón concreta: reiniciar la API no puede tumbar la
 * sesión de WhatsApp. Una sesión que se cae y se rehace a menudo es
 * exactamente el patrón por el que WhatsApp cierra un número, y el de la
 * clínica lleva años en Google Maps y tarjetas: no es reemplazable.
 *
 * Su superficie es mínima a propósito: escucha en localhost, no en la red, y
 * Caddy nunca lo expone. Quien manda mensajes es la API.
 */
// En produccion las variables vienen del entorno del proceso. En local se
// leen del .env de la API: la clave de cifrado tiene que ser LA MISMA que
// usa la API, y tenerla duplicada en dos archivos es tenerla mal en uno.
const env = join(import.meta.dirname, '..', '..', 'api', '.env');
if (existsSync(env) && !process.env.DATABASE_URL) {
  for (const linea of readFileSync(env, 'utf8').split(/\r?\n/)) {
    const m = /^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/i.exec(linea);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].trim();
  }
}

const prisma = new PrismaClient();
const clave = claveDesdeEntorno();
const sesiones = new Map<string, Sesion>();

const PUERTO = Number(process.env.GATEWAY_PORT ?? 3002);

async function arrancar(): Promise<void> {
  // Se levantan solo los canales que ya estaban vinculados. Los que esperan
  // QR requieren que alguien esté delante para escanearlo: conectarlos al
  // arrancar solo generaría códigos que caducan sin que nadie los vea.
  const canales = await prisma.channel.findMany({
    where: { provider: 'BAILEYS', authState: { not: null } },
    select: { id: true, name: true },
  });

  for (const c of canales) await abrir(c.id);
  console.log(`[gateway] ${canales.length} canal(es) restaurado(s)`);
}

async function abrir(channelId: string): Promise<Sesion> {
  const existente = sesiones.get(channelId);
  if (existente) return existente;

  const s = new Sesion(prisma, channelId, clave, {
    onMensaje: (m) => guardarEntrante(prisma, m),
  });
  sesiones.set(channelId, s);
  await s.conectar();
  return s;
}

createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  const responder = (codigo: number, cuerpo: unknown) => {
    res.writeHead(codigo, { 'content-type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(cuerpo));
  };

  if (url.pathname === '/salud') {
    return responder(200, {
      estado: 'ok',
      sesiones: [...sesiones.keys()],
    });
  }

  // POST /canales/:id/conectar — lo llama la API cuando un administrador
  // pulsa "vincular" y hay alguien delante para escanear el QR.
  const conectar = /^\/canales\/([\w-]+)\/conectar$/.exec(url.pathname);
  if (conectar && req.method === 'POST') {
    abrir(conectar[1])
      .then(() => responder(202, { ok: true }))
      .catch((e: Error) => responder(500, { error: e.message }));
    return;
  }

  const enviar = /^\/canales\/([\w-]+)\/enviar$/.exec(url.pathname);
  if (enviar && req.method === 'POST') {
    let cuerpo = '';
    req.on('data', (c) => (cuerpo += c));
    req.on('end', () => {
      const s = sesiones.get(enviar[1]);
      if (!s) return responder(409, { error: 'Canal no conectado' });

      const { a, texto } = JSON.parse(cuerpo || '{}') as { a?: string; texto?: string };
      if (!a || !texto) return responder(400, { error: 'Faltan `a` y `texto`' });

      s.enviarTexto(a, texto)
        .then((externalId) => responder(200, { externalId }))
        .catch((e: Error) => responder(502, { error: e.message }));
    });
    return;
  }

  responder(404, { error: 'No encontrado' });
}).listen(PUERTO, '127.0.0.1', () => {
  console.log(`[gateway] escuchando en 127.0.0.1:${PUERTO}`);
  void arrancar();
});

for (const senal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(senal, () => {
    console.log(`[gateway] ${senal}: cerrando sesiones`);
    void Promise.all([...sesiones.values()].map((s) => s.desconectar()))
      .then(() => prisma.$disconnect())
      .finally(() => process.exit(0));
  });
}
