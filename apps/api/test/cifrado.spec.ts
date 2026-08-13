import { randomBytes } from 'node:crypto';

import { cifrar, claveDesdeEntorno, descifrar, igualSeguro } from '../src/common/utils/cifrado.util';

/**
 * Esto protege las credenciales con las que la clínica habla por WhatsApp
 * con sus pacientes. Si falla, alguien puede hacerse pasar por la clínica.
 * Las pruebas comprueban las tres cosas que de verdad importan: que vuelva
 * el mismo texto, que el mismo contenido NO produzca el mismo cifrado, y que
 * un texto manipulado falle en vez de devolver basura.
 */
describe('cifrado del auth state', () => {
  const clave = randomBytes(32);

  it('lo que se cifra vuelve igual', () => {
    const secreto = JSON.stringify({ creds: { me: { id: '573105149719@s.whatsapp.net' } } });
    expect(descifrar(cifrar(secreto, clave), clave)).toBe(secreto);
  });

  it('aguanta acentos, emoji y textos largos', () => {
    const raro = '👁 Visión Colombia — ñandú ' + 'x'.repeat(50_000);
    expect(descifrar(cifrar(raro, clave), clave)).toBe(raro);
  });

  it('el mismo texto nunca produce el mismo cifrado', () => {
    // Si el IV se reutilizara, GCM se rompe entero. Esto lo detecta.
    const salidas = new Set(Array.from({ length: 50 }, () => cifrar('igual', clave)));
    expect(salidas.size).toBe(50);
  });

  it('un texto cifrado manipulado falla, no devuelve basura', () => {
    const [iv, tag, datos] = cifrar('secreto', clave).split('.');
    const alterado = Buffer.from(datos, 'base64');
    alterado[0] ^= 0xff;

    expect(() => descifrar([iv, tag, alterado.toString('base64')].join('.'), clave)).toThrow();
  });

  it('una etiqueta manipulada falla', () => {
    const [iv, tag, datos] = cifrar('secreto', clave).split('.');
    const otraTag = Buffer.from(tag, 'base64');
    otraTag[0] ^= 0xff;

    expect(() => descifrar([iv, otraTag.toString('base64'), datos].join('.'), clave)).toThrow();
  });

  it('con otra clave no se descifra', () => {
    expect(() => descifrar(cifrar('secreto', clave), randomBytes(32))).toThrow();
  });

  it('rechaza formatos inválidos', () => {
    expect(() => descifrar('no-es-un-paquete', clave)).toThrow(/formato/i);
    expect(() => descifrar('a.b', clave)).toThrow(/formato/i);
    expect(() => cifrar('x', randomBytes(16))).toThrow(/32 bytes/);
  });

  it('la clave del entorno tiene que ser de 32 bytes', () => {
    const previo = process.env.CLAVE_PRUEBA;

    process.env.CLAVE_PRUEBA = 'corta';
    expect(() => claveDesdeEntorno('CLAVE_PRUEBA')).toThrow(/32 bytes/);

    delete process.env.CLAVE_PRUEBA;
    expect(() => claveDesdeEntorno('CLAVE_PRUEBA')).toThrow(/Falta/);

    process.env.CLAVE_PRUEBA = randomBytes(32).toString('hex');
    expect(claveDesdeEntorno('CLAVE_PRUEBA')).toHaveLength(32);

    if (previo === undefined) delete process.env.CLAVE_PRUEBA;
    else process.env.CLAVE_PRUEBA = previo;
  });

  it('la comparación segura distingue longitud y contenido', () => {
    expect(igualSeguro('abc', 'abc')).toBe(true);
    expect(igualSeguro('abc', 'abd')).toBe(false);
    expect(igualSeguro('abc', 'abcd')).toBe(false);
  });
});
