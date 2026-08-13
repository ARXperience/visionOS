import { PrismaClient } from '@prisma/client';
import { initAuthCreds } from '@whiskeysockets/baileys';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { after, before, describe, it } from 'node:test';

import { authStateEnPostgres } from '../src/auth-state.js';
import { aE164 } from '../src/entrada.js';

/**
 * Se usa el runner de Node y no jest: Baileys rc13 es ESM puro, jest lo
 * resolvía como CommonJS y fallaba con "Cannot use import statement outside
 * a module". Pelearse con la configuración de jest para cargar un módulo ESM
 * cuesta más que usar el runner que ya viene con Node.
 *
 *   npm run test --workspace apps/whatsapp-gateway
 */
const env = join(import.meta.dirname, '..', '..', 'api', '.env');
if (existsSync(env) && !process.env.DATABASE_URL) {
  for (const linea of readFileSync(env, 'utf8').split(/\r?\n/)) {
    const m = /^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/i.exec(linea);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].trim();
  }
}

describe('normalización de teléfono', () => {
  it('convierte remoteJid a E.164', () => {
    assert.equal(aE164('573001234567@s.whatsapp.net'), '+573001234567');
    assert.equal(aE164('573001234567:12@s.whatsapp.net'), '+573001234567');
    assert.equal(aE164('57 300 123 4567@c.us'), '+573001234567');
  });
});

/**
 * Contra la base real. Lo que se comprueba es que la sesión SOBREVIVA a un
 * reinicio: si no sobrevive, cada despliegue obliga a escanear el QR, y una
 * sesión que se recrea a menudo es el patrón por el que WhatsApp cierra un
 * número — el de la clínica, que lleva años publicado.
 */
describe('auth state en Postgres', { skip: !process.env.DATABASE_URL }, () => {
  const prisma = new PrismaClient();
  const clave = randomBytes(32);
  let channelId: string;

  before(async () => {
    const c = await prisma.channel.create({
      data: { provider: 'BAILEYS', name: `prueba-${Date.now()}` },
      select: { id: true },
    });
    channelId = c.id;
  });

  after(async () => {
    await prisma.channel.delete({ where: { id: channelId } }).catch(() => undefined);
    await prisma.$disconnect();
  });

  it('guarda y recupera las credenciales entre reinicios', async () => {
    const primera = await authStateEnPostgres(prisma, channelId, clave);
    primera.state.creds.me = { id: '573105149719:1@s.whatsapp.net', name: 'Visión Colombia' };
    await primera.guardar();

    // Segundo arranque: otro proceso, misma fila.
    const segunda = await authStateEnPostgres(prisma, channelId, clave);
    assert.equal(segunda.state.creds.me?.id, '573105149719:1@s.whatsapp.net');
  });

  it('las credenciales quedan cifradas, no legibles en la base', async () => {
    const fila = await prisma.channel.findUniqueOrThrow({
      where: { id: channelId },
      select: { authState: true },
    });

    assert.ok(fila.authState);
    // Ni el número ni el nombre pueden leerse en claro en la base.
    assert.ok(!fila.authState.includes('573105149719'));
    assert.ok(!fila.authState.includes('Visión Colombia'));
    assert.equal(fila.authState.split('.').length, 3);
  });

  it('conserva los Buffer de las claves de Signal', async () => {
    const a = await authStateEnPostgres(prisma, channelId, clave);
    const secreto = randomBytes(32);
    await a.state.keys.set({ 'pre-key': { '7': { public: secreto, private: secreto } } } as never);

    const b = await authStateEnPostgres(prisma, channelId, clave);
    const leido = (await b.state.keys.get('pre-key', ['7'])) as Record<string, { public: Uint8Array }>;
    // Sin BufferJSON esto volvería como objeto plano y el handshake de
    // Signal fallaría con un error incomprensible.
    assert.deepEqual(Buffer.from(leido['7'].public), secreto);
  });

  it('borrar una clave la quita, no deja el blob creciendo', async () => {
    const a = await authStateEnPostgres(prisma, channelId, clave);
    await a.state.keys.set({ 'pre-key': { '7': null } } as never);

    const b = await authStateEnPostgres(prisma, channelId, clave);
    assert.deepEqual(await b.state.keys.get('pre-key', ['7']), {});
  });

  it('con un estado ilegible empieza de cero en vez de reventar', async () => {
    await prisma.channel.update({
      where: { id: channelId },
      data: { authState: 'basura.que.no-descifra' },
    });

    const a = await authStateEnPostgres(prisma, channelId, clave);
    // Credenciales nuevas y utilizables: la alternativa sería un proceso que
    // no arranca y una clínica sin WhatsApp.
    assert.equal(typeof a.state.creds.registrationId, 'number');
    assert.equal(a.state.creds.me, undefined);
  });

  it('olvidar deja el canal listo para un QR nuevo', async () => {
    const a = await authStateEnPostgres(prisma, channelId, clave);
    await a.guardar();
    await a.olvidar();

    const fila = await prisma.channel.findUniqueOrThrow({
      where: { id: channelId },
      select: { authState: true, qrCode: true },
    });
    assert.equal(fila.authState, null);
    assert.equal(fila.qrCode, null);
  });

  it('initAuthCreds produce credenciales distintas cada vez', () => {
    assert.notEqual(initAuthCreds().registrationId, initAuthCreds().registrationId);
  });
});
