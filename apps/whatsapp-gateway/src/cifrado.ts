import { createCipheriv, createDecipheriv, randomBytes, timingSafeEqual } from 'node:crypto';

/**
 * Copia de apps/api/src/common/utils/cifrado.util.ts.
 *
 * Se copia y no se comparte por un paquete: son dos procesos que se
 * despliegan por separado, y crear packages/ para 60 lineas costaria mas
 * que mantener esta copia. Si divergen, la prueba del API no lo detecta:
 * por eso el gateway trae la suya.
 *
 * Cifrado simétrico para secretos que sí tienen que volver en claro.
 *
 * Existe por las credenciales de sesión de Baileys. `useMultiFileAuthState`
 * las escribe en texto plano en una carpeta: quien lea ese directorio se hace
 * pasar por la clínica en WhatsApp — puede leer conversaciones de pacientes y
 * escribirles. Y de paso se pierden al recrear el contenedor, con lo que hay
 * que volver a escanear el QR.
 *
 * AES-256-GCM y no AES-CBC: GCM es autenticado, así que un texto cifrado
 * manipulado falla al descifrar en vez de devolver basura que el programa
 * intentaría interpretar.
 *
 * La clave vive en WHATSAPP_AUTH_ENCRYPTION_KEY, en el entorno, nunca en la
 * base: guardarla junto a lo que protege sería no cifrar nada.
 */
const ALGORITMO = 'aes-256-gcm';

/** IV de 12 bytes: el tamaño para el que GCM está definido y optimizado. */
const IV_BYTES = 12;

export function claveDesdeEntorno(nombre = 'WHATSAPP_AUTH_ENCRYPTION_KEY'): Buffer {
  const hex = process.env[nombre];
  if (!hex) throw new Error(`Falta ${nombre}. Generar con: openssl rand -hex 32`);

  const clave = Buffer.from(hex, 'hex');
  if (clave.length !== 32) {
    throw new Error(`${nombre} debe ser de 32 bytes (64 caracteres hex), no ${clave.length}`);
  }
  return clave;
}

/** Devuelve `iv.tag.ciphertext`, todo en base64. */
export function cifrar(texto: string, clave: Buffer): string {
  if (clave.length !== 32) throw new Error('La clave debe ser de 32 bytes');

  // IV nuevo en cada escritura. Reutilizarlo con la misma clave rompe GCM
  // por completo: no es una recomendación, es la condición para que sirva.
  const iv = randomBytes(IV_BYTES);
  const cifrador = createCipheriv(ALGORITMO, clave, iv);
  const datos = Buffer.concat([cifrador.update(texto, 'utf8'), cifrador.final()]);

  return [iv.toString('base64'), cifrador.getAuthTag().toString('base64'), datos.toString('base64')].join(
    '.',
  );
}

export function descifrar(paquete: string, clave: Buffer): string {
  const partes = paquete.split('.');
  if (partes.length !== 3) throw new Error('Formato de cifrado inválido');

  const [iv, tag, datos] = partes.map((p) => Buffer.from(p, 'base64'));
  if (iv.length !== IV_BYTES) throw new Error('IV inválido');

  const descifrador = createDecipheriv(ALGORITMO, clave, iv);
  descifrador.setAuthTag(tag);
  // `final()` lanza si la etiqueta no cuadra: ahí es donde se detecta que
  // alguien tocó el texto cifrado.
  return Buffer.concat([descifrador.update(datos), descifrador.final()]).toString('utf8');
}

/** Comparación en tiempo constante, para no filtrar información por la duración. */
export function igualSeguro(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}
