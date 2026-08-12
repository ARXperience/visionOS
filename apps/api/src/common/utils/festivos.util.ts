/**
 * Festivos de Colombia, calculados.
 *
 * Se calculan y no se pegan en una tabla porque una tabla de un año se
 * vence el 1 de enero siguiente y la agenda empieza a ofrecer citas en
 * festivo sin que nadie se entere hasta que el paciente llega a la puerta
 * cerrada.
 *
 * Dos reglas:
 *  - Ley 51 de 1983 ("Emiliani"): varios festivos se trasladan al lunes
 *    siguiente. Los que no se trasladan están marcados como fijos.
 *  - Los festivos móviles se cuentan en días desde el Domingo de Pascua.
 */

/** Domingo de Pascua por el algoritmo de Meeus/Jones/Butcher (gregoriano). */
export function domingoDePascua(anio: number): Date {
  const a = anio % 19;
  const b = Math.floor(anio / 100);
  const c = anio % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(anio, mes - 1, dia));
}

const dias = (fecha: Date, n: number) =>
  new Date(fecha.getTime() + n * 86_400_000);

/** Traslado al lunes siguiente cuando no cae en lunes. */
function alLunes(fecha: Date): Date {
  const dow = fecha.getUTCDay(); // 0 = domingo, 1 = lunes
  return dow === 1 ? fecha : dias(fecha, (8 - dow) % 7);
}

/** [mes (1-12), día, nombre, ¿se traslada al lunes?] */
const FIJOS: [number, number, string, boolean][] = [
  [1, 1, 'Año Nuevo', false],
  [1, 6, 'Día de los Reyes Magos', true],
  [3, 19, 'Día de San José', true],
  [5, 1, 'Día del Trabajo', false],
  [6, 29, 'San Pedro y San Pablo', true],
  [7, 20, 'Día de la Independencia', false],
  [8, 7, 'Batalla de Boyacá', false],
  [8, 15, 'Asunción de la Virgen', true],
  [10, 12, 'Día de la Raza', true],
  [11, 1, 'Todos los Santos', true],
  [11, 11, 'Independencia de Cartagena', true],
  [12, 8, 'Inmaculada Concepción', false],
  [12, 25, 'Navidad', false],
];

/** [días desde Pascua, nombre, ¿se traslada al lunes?] */
const MOVILES: [number, string, boolean][] = [
  [-3, 'Jueves Santo', false],
  [-2, 'Viernes Santo', false],
  [39, 'Ascensión del Señor', true],
  [60, 'Corpus Christi', true],
  [68, 'Sagrado Corazón de Jesús', true],
];

export interface Festivo {
  /** ISO yyyy-mm-dd. */
  date: string;
  name: string;
}

/**
 * Los 18 festivos del año, **agrupados por fecha**.
 *
 * Devuelve menos de 18 entradas cuando dos coinciden. Pasa de verdad: con
 * Pascua tardía, Sagrado Corazón (Pascua + 68, trasladado) cae en el mismo
 * lunes que San Pedro y San Pablo — 2030, 2038 y 2041 en las dos décadas
 * próximas. Son dos celebraciones, pero un solo día no laborable, y la tabla
 * `holidays` tiene la fecha como clave primaria: devolverlas sueltas
 * reventaría el seed el 1 de enero de 2030 y nadie sabría por qué.
 */
export function festivosDe(anio: number): Festivo[] {
  const pascua = domingoDePascua(anio);

  const crudos: [Date, string][] = [
    ...FIJOS.map(([m, d, nombre, mueve]): [Date, string] => {
      const f = new Date(Date.UTC(anio, m - 1, d));
      return [mueve ? alLunes(f) : f, nombre];
    }),
    ...MOVILES.map(([offset, nombre, mueve]): [Date, string] => {
      const f = dias(pascua, offset);
      return [mueve ? alLunes(f) : f, nombre];
    }),
  ];

  const porFecha = new Map<string, string[]>();
  for (const [f, nombre] of crudos) {
    const date = f.toISOString().slice(0, 10);
    porFecha.set(date, [...(porFecha.get(date) ?? []), nombre]);
  }

  return [...porFecha.entries()]
    .map(([date, nombres]) => ({ date, name: nombres.join(' y ') }))
    .sort((a, b) => a.date.localeCompare(b.date));
}
