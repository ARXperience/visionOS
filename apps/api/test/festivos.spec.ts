import { domingoDePascua, festivosDe } from '../src/common/utils/festivos.util';

/**
 * Verdad de referencia: la tabla de festivos 2026 del ERP de Servimil
 * (67_HORARIOS_Y_FESTIVOS_COLOMBIA.md), que se usa hoy en producción.
 * Si el cálculo no la reproduce exacta, el cálculo está mal.
 */
const COLOMBIA_2026 = [
  ['2026-01-01', 'Año Nuevo'],
  ['2026-01-12', 'Día de los Reyes Magos'],
  ['2026-03-23', 'Día de San José'],
  ['2026-04-02', 'Jueves Santo'],
  ['2026-04-03', 'Viernes Santo'],
  ['2026-05-01', 'Día del Trabajo'],
  ['2026-05-18', 'Ascensión del Señor'],
  ['2026-06-08', 'Corpus Christi'],
  ['2026-06-15', 'Sagrado Corazón de Jesús'],
  ['2026-06-29', 'San Pedro y San Pablo'],
  ['2026-07-20', 'Día de la Independencia'],
  ['2026-08-07', 'Batalla de Boyacá'],
  ['2026-08-17', 'Asunción de la Virgen'],
  ['2026-10-12', 'Día de la Raza'],
  ['2026-11-02', 'Todos los Santos'],
  ['2026-11-16', 'Independencia de Cartagena'],
  ['2026-12-08', 'Inmaculada Concepción'],
  ['2026-12-25', 'Navidad'],
];

describe('festivos de Colombia', () => {
  it('reproduce exactamente los 18 de 2026', () => {
    expect(festivosDe(2026).map((f) => [f.date, f.name])).toEqual(COLOMBIA_2026);
  });

  it('calcula el Domingo de Pascua', () => {
    // Fechas verificables contra cualquier calendario litúrgico.
    expect(domingoDePascua(2026).toISOString().slice(0, 10)).toBe('2026-04-05');
    expect(domingoDePascua(2027).toISOString().slice(0, 10)).toBe('2027-03-28');
    expect(domingoDePascua(2030).toISOString().slice(0, 10)).toBe('2030-04-21');
  });

  it('aplica la ley Emiliani: los trasladables caen siempre en lunes', () => {
    const trasladables = new Set([
      'Día de los Reyes Magos',
      'Día de San José',
      'Ascensión del Señor',
      'Corpus Christi',
      'Sagrado Corazón de Jesús',
      'San Pedro y San Pablo',
      'Asunción de la Virgen',
      'Día de la Raza',
      'Todos los Santos',
      'Independencia de Cartagena',
    ]);

    for (const anio of [2026, 2027, 2028, 2030]) {
      for (const f of festivosDe(anio).filter((x) => trasladables.has(x.name))) {
        expect(`${f.name} ${f.date}: ${new Date(f.date).getUTCDay()}`).toBe(
          `${f.name} ${f.date}: 1`,
        );
      }
    }
  });

  it('no traslada los que la ley deja fijos', () => {
    // 2027: Navidad cae sábado y NO se mueve; el 20 de julio cae martes.
    const f2027 = Object.fromEntries(festivosDe(2027).map((f) => [f.name, f.date]));
    expect(f2027['Navidad']).toBe('2027-12-25');
    expect(f2027['Día de la Independencia']).toBe('2027-07-20');
    expect(f2027['Batalla de Boyacá']).toBe('2027-08-07');
  });

  it('nunca repite una fecha: `holidays` la tiene como clave primaria', () => {
    for (let anio = 2026; anio <= 2060; anio++) {
      const f = festivosDe(anio);
      expect(new Set(f.map((x) => x.date)).size).toBe(f.length);
      expect(f.length).toBeLessThanOrEqual(18);
    }
  });

  it('agrupa los dos festivos que caen el mismo lunes con Pascua tardía', () => {
    // 2030: San Pedro y San Pablo (29-jun, sábado) y Sagrado Corazón
    // (Pascua+68 = 28-jun, viernes) se trasladan ambos al lunes 1 de julio.
    // Son dos celebraciones y un solo día no laborable.
    const f2030 = festivosDe(2030);
    expect(f2030).toHaveLength(17);
    expect(f2030.find((f) => f.date === '2030-07-01')?.name).toBe(
      'San Pedro y San Pablo y Sagrado Corazón de Jesús',
    );
  });
});
