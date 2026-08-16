import { ENTRADA, PAUSA, SALIDA, faltantes } from '../src/modules/surgeries/lista-oms';

/**
 * La lista de la OMS solo sirve si no se puede cerrar a medias. Estas pruebas
 * fijan eso, porque el día que alguien "agilice" el formulario, aquí se rompe.
 */
describe('lista de verificación de la OMS', () => {
  const todoSi = (items: { clave: string }[]) =>
    Object.fromEntries(items.map((i) => [i.clave, true]));

  it('una fase vacía no se puede cerrar', () => {
    expect(faltantes('ENTRADA', {}).length).toBeGreaterThan(0);
    expect(faltantes('PAUSA', {}).length).toBeGreaterThan(0);
    expect(faltantes('SALIDA', {}).length).toBeGreaterThan(0);
  });

  it('con todos los obligatorios en true, cierra', () => {
    expect(faltantes('ENTRADA', todoSi(ENTRADA))).toEqual([]);
    expect(faltantes('PAUSA', todoSi(PAUSA))).toEqual([]);
    expect(faltantes('SALIDA', todoSi(SALIDA))).toEqual([]);
  });

  it('los opcionales no bloquean', () => {
    const soloObligatorios = Object.fromEntries(
      ENTRADA.filter((i) => i.obligatorio).map((i) => [i.clave, true]),
    );
    expect(faltantes('ENTRADA', soloObligatorios)).toEqual([]);
  });

  it('solo cuenta el true literal', () => {
    // Un formulario mal armado manda "si", 1 o "true". Ninguno es una
    // verificación hecha, y tratarlos como tal es justo el fallo silencioso
    // que la lista existe para evitar.
    for (const valor of ['si', 'true', 1, 'on', {}, [], 'false'] as unknown[]) {
      const respuestas = Object.fromEntries(PAUSA.map((i) => [i.clave, valor]));
      expect(faltantes('PAUSA', respuestas).length).toBeGreaterThan(0);
    }
  });

  it('un false explícito tampoco pasa', () => {
    const respuestas = { ...todoSi(PAUSA), confirmacion_en_voz_alta: false };
    expect(faltantes('PAUSA', respuestas)).toHaveLength(1);
  });

  it('el ojo marcado y la confirmación en voz alta son obligatorios', () => {
    // Si alguien los vuelve opcionales, este test lo dice.
    expect(ENTRADA.find((i) => i.clave === 'ojo_marcado')?.obligatorio).toBe(true);
    expect(PAUSA.find((i) => i.clave === 'confirmacion_en_voz_alta')?.obligatorio).toBe(true);
    expect(ENTRADA.find((i) => i.clave === 'consentimiento')?.obligatorio).toBe(true);
    expect(SALIDA.find((i) => i.clave === 'recuento')?.obligatorio).toBe(true);
  });

  it('las claves no se repiten dentro de una fase', () => {
    for (const fase of [ENTRADA, PAUSA, SALIDA]) {
      const claves = fase.map((i) => i.clave);
      expect(new Set(claves).size).toBe(claves.length);
    }
  });
});
