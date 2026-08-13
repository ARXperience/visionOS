import { BufferJSON, initAuthCreds } from '@whiskeysockets/baileys';
import type { AuthenticationCreds, AuthenticationState, SignalDataTypeMap } from '@whiskeysockets/baileys';
import type { PrismaClient } from '@prisma/client';

import { cifrar, descifrar } from './cifrado.js';

/**
 * Estado de sesión de Baileys guardado en Postgres y cifrado.
 *
 * Es el reemplazo de `useMultiFileAuthState`, que escribe las credenciales en
 * TEXTO PLANO en una carpeta. Dos problemas, y ninguno es teórico:
 *
 *  1. Quien lea ese directorio se hace pasar por la clínica en WhatsApp:
 *     puede leer las conversaciones de los pacientes y escribirles.
 *  2. La carpeta muere con el contenedor. Cada despliegue obligaría a
 *     escanear el QR otra vez, y una sesión que se recrea a menudo es
 *     exactamente el patrón que hace que WhatsApp cierre el número.
 *
 * Todo el estado va en una fila, en un solo blob. Baileys guarda claves de
 * Signal por (tipo, id) y sería más fino guardarlas por separado, pero una
 * clínica con una línea tiene un puñado de kilobytes: partirlo en filas es
 * complejidad sin ganancia. Si algún día hay diez líneas y el blob crece,
 * el sitio donde partirlo es `keys.set`.
 *
 * ponytail: blob único por canal; pasar a fila por clave si el estado crece.
 */
export interface EstadoPersistido {
  state: AuthenticationState;
  /** Guarda credenciales y claves. Baileys lo llama en cada cambio. */
  guardar: () => Promise<void>;
  /** Borra la sesión: obliga a escanear el QR de nuevo. */
  olvidar: () => Promise<void>;
}

type Claves = Record<string, Record<string, unknown>>;

export async function authStateEnPostgres(
  prisma: PrismaClient,
  channelId: string,
  clave: Buffer,
): Promise<EstadoPersistido> {
  const canal = await prisma.channel.findUniqueOrThrow({
    where: { id: channelId },
    select: { authState: true },
  });

  let creds: AuthenticationCreds;
  let claves: Claves = {};

  if (canal.authState) {
    try {
      const crudo = JSON.parse(descifrar(canal.authState, clave), BufferJSON.reviver) as {
        creds: AuthenticationCreds;
        keys: Claves;
      };
      creds = crudo.creds;
      claves = crudo.keys ?? {};
    } catch (e) {
      // Credenciales ilegibles: se empieza de cero en vez de arrastrar un
      // estado corrupto que haría fallar el handshake una y otra vez. Se
      // avisa fuerte porque implica volver a escanear el QR.
      console.error(
        `[auth-state] Estado del canal ${channelId} ilegible (${(e as Error).message}). ` +
          'Se empieza una sesión nueva: habrá que escanear el QR.',
      );
      creds = initAuthCreds();
    }
  } else {
    creds = initAuthCreds();
  }

  // Se escribe entera cada vez, pero nunca dos a la vez: sin esta cola, dos
  // guardados solapados pueden dejar en la base el estado más viejo.
  let cola: Promise<void> = Promise.resolve();

  const guardar = () => {
    cola = cola.then(async () => {
      const paquete = cifrar(JSON.stringify({ creds, keys: claves }, BufferJSON.replacer), clave);
      await prisma.channel.update({ where: { id: channelId }, data: { authState: paquete } });
    });
    return cola;
  };

  const state: AuthenticationState = {
    creds,
    keys: {
      get: async (tipo, ids) => {
        const bolsa = claves[tipo] ?? {};
        const salida: Record<string, unknown> = {};
        for (const id of ids) {
          if (bolsa[id] !== undefined) salida[id] = bolsa[id];
        }
        return salida as { [id: string]: SignalDataTypeMap[typeof tipo] };
      },
      set: async (datos) => {
        for (const [tipo, porId] of Object.entries(datos)) {
          claves[tipo] ??= {};
          for (const [id, valor] of Object.entries(porId ?? {})) {
            // null significa borrar: dejarlo escrito haría crecer el blob
            // indefinidamente con claves de sesión ya caducadas.
            if (valor === null || valor === undefined) delete claves[tipo][id];
            else claves[tipo][id] = valor;
          }
        }
        await guardar();
      },
    },
  };

  return {
    state,
    guardar,
    olvidar: async () => {
      claves = {};
      await prisma.channel.update({
        where: { id: channelId },
        data: { authState: null, qrCode: null, qrExpiresAt: null },
      });
    },
  };
}
