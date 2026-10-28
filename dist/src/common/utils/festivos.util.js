"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.domingoDePascua = domingoDePascua;
exports.festivosDe = festivosDe;
function domingoDePascua(anio) {
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
const dias = (fecha, n) => new Date(fecha.getTime() + n * 86_400_000);
function alLunes(fecha) {
    const dow = fecha.getUTCDay();
    return dow === 1 ? fecha : dias(fecha, (8 - dow) % 7);
}
const FIJOS = [
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
const MOVILES = [
    [-3, 'Jueves Santo', false],
    [-2, 'Viernes Santo', false],
    [39, 'Ascensión del Señor', true],
    [60, 'Corpus Christi', true],
    [68, 'Sagrado Corazón de Jesús', true],
];
function festivosDe(anio) {
    const pascua = domingoDePascua(anio);
    const crudos = [
        ...FIJOS.map(([m, d, nombre, mueve]) => {
            const f = new Date(Date.UTC(anio, m - 1, d));
            return [mueve ? alLunes(f) : f, nombre];
        }),
        ...MOVILES.map(([offset, nombre, mueve]) => {
            const f = dias(pascua, offset);
            return [mueve ? alLunes(f) : f, nombre];
        }),
    ];
    const porFecha = new Map();
    for (const [f, nombre] of crudos) {
        const date = f.toISOString().slice(0, 10);
        porFecha.set(date, [...(porFecha.get(date) ?? []), nombre]);
    }
    return [...porFecha.entries()]
        .map(([date, nombres]) => ({ date, name: nombres.join(' y ') }))
        .sort((a, b) => a.date.localeCompare(b.date));
}
//# sourceMappingURL=festivos.util.js.map