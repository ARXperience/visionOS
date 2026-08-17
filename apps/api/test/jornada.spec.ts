/**
 * El día de caja no es el día UTC, y un día de calendario no es un instante.
 *
 * Las dos confusiones cuestan lo mismo: un pago contado en el día equivocado
 * descuadra DOS cajas —la de hoy sobra y la de mañana falta— y es de los
 * errores que se buscan durante una semana.
 *
 * Las funciones son privadas del servicio; se replican aquí porque lo que se
 * prueba es la regla, no el acoplamiento.
 */
const OFFSET_HORAS = 5;

/** Día de caja al que pertenece un INSTANTE. */
function diaDe(instante: Date): string {
  return new Date(instante.getTime() - OFFSET_HORAS * 3_600_000).toISOString().slice(0, 10);
}

/** Ventana de un día de CALENDARIO, recibido como 'AAAA-MM-DD'. */
function ventanaDe(dia: string) {
  const desde = new Date(`${dia}T00:00:00.000Z`).getTime() + OFFSET_HORAS * 3_600_000;
  return { dia, desde: new Date(desde), hasta: new Date(desde + 86_400_000 - 1) };
}

describe('día de caja', () => {
  it('las 6 de la tarde en Bogotá siguen siendo el mismo día', () => {
    // 2026-08-17 18:00 en Bogotá = 2026-08-17T23:00Z.
    expect(diaDe(new Date('2026-08-17T23:00:00Z'))).toBe('2026-08-17');
  });

  it('las 8 de la noche en Bogotá ya son otro día en UTC, pero no en caja', () => {
    // 2026-08-17 20:00 en Bogotá = 2026-08-18T01:00Z. Sin corregir el
    // desfase, este pago caería en la caja del 18.
    expect(diaDe(new Date('2026-08-18T01:00:00Z'))).toBe('2026-08-17');
  });

  it('la medianoche de Bogotá abre el día nuevo', () => {
    expect(diaDe(new Date('2026-08-18T05:00:00Z'))).toBe('2026-08-18');
    expect(diaDe(new Date('2026-08-18T04:59:59Z'))).toBe('2026-08-17');
  });

  it('la ventana cubre 24 horas exactas, sin huecos ni solapes', () => {
    const hoy = ventanaDe('2026-08-17');
    const manana = ventanaDe('2026-08-18');

    expect(hoy.hasta.getTime() - hoy.desde.getTime()).toBe(86_400_000 - 1);
    // El milisegundo siguiente al cierre es el arranque del día siguiente:
    // ni un pago se pierde entre las dos ventanas.
    expect(manana.desde.getTime() - hoy.hasta.getTime()).toBe(1);
  });

  it('cualquier instante cae dentro de la ventana de su propio día', () => {
    for (const iso of [
      '2026-01-01T05:00:00Z',
      '2026-08-17T23:59:59Z',
      '2026-08-18T04:59:59Z',
      '2026-12-31T23:00:00Z',
    ]) {
      const t = new Date(iso);
      const v = ventanaDe(diaDe(t));
      expect(t.getTime()).toBeGreaterThanOrEqual(v.desde.getTime());
      expect(t.getTime()).toBeLessThanOrEqual(v.hasta.getTime());
    }
  });

  it('un día de calendario NO se convierte en instante primero', () => {
    // Este es el error que se cometió: `new Date('2026-08-16')` es medianoche
    // UTC, que en Bogotá son las 7 de la tarde del 15. Pasarlo por diaDe()
    // devuelve el día anterior, y el cierre se hace sobre la caja equivocada.
    expect(diaDe(new Date('2026-08-16'))).toBe('2026-08-15');

    // Tomando el día tal cual, la ventana es la correcta.
    expect(ventanaDe('2026-08-16').dia).toBe('2026-08-16');
    expect(ventanaDe('2026-08-16').desde.toISOString()).toBe('2026-08-16T05:00:00.000Z');
  });

  it('el día de calendario sobrevive la ida y vuelta', () => {
    for (const dia of ['2026-01-01', '2026-02-28', '2026-08-16', '2026-12-31']) {
      const v = ventanaDe(dia);
      expect(diaDe(v.desde)).toBe(dia);
      expect(diaDe(v.hasta)).toBe(dia);
    }
  });
});
