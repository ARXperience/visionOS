/**
 * Lista de verificación de seguridad quirúrgica de la OMS, adaptada a
 * oftalmología.
 *
 * Está en código y no en una tabla configurable a propósito: es un estándar
 * publicado, no una preferencia de la clínica. Volverlo configurable invita a
 * que alguien "simplifique" la lista un día de agenda apretada, que es
 * exactamente el día en que sirve.
 *
 * Cada ítem obligatorio hay que responderlo con `true` para poder cerrar su
 * fase. No hay "no aplica" en los obligatorios: si de verdad no aplica, la
 * fase no se cierra y queda la cirugía suspendida con su motivo.
 */

export interface Item {
  clave: string;
  texto: string;
  /** Sin esto la fase no cierra. */
  obligatorio: boolean;
}

/** Antes de la anestesia, con el paciente despierto y participando. */
export const ENTRADA: Item[] = [
  { clave: 'identidad', texto: 'El paciente confirmó su nombre y documento', obligatorio: true },
  { clave: 'procedimiento', texto: 'El paciente confirmó qué procedimiento le van a hacer', obligatorio: true },
  {
    clave: 'ojo_marcado',
    texto: 'El ojo a operar está MARCADO y el paciente lo confirmó',
    obligatorio: true,
  },
  { clave: 'consentimiento', texto: 'El consentimiento informado está firmado', obligatorio: true },
  { clave: 'alergias', texto: 'Se preguntó por alergias', obligatorio: true },
  { clave: 'ayuno', texto: 'Se verificó el ayuno cuando la anestesia lo exige', obligatorio: false },
  { clave: 'anticoagulantes', texto: 'Se revisó uso de anticoagulantes', obligatorio: false },
  { clave: 'equipo_anestesia', texto: 'El equipo de anestesia está revisado', obligatorio: true },
  { clave: 'pulsioximetro', texto: 'El pulsioxímetro está puesto y funciona', obligatorio: true },
];

/** La pausa quirúrgica: TODOS se detienen, antes de la incisión. */
export const PAUSA: Item[] = [
  { clave: 'presentacion', texto: 'Todo el equipo se presentó por nombre y función', obligatorio: true },
  {
    clave: 'confirmacion_en_voz_alta',
    texto: 'Cirujano, anestesia y enfermería confirmaron EN VOZ ALTA paciente, procedimiento y OJO',
    obligatorio: true,
  },
  { clave: 'lio_disponible', texto: 'El lente intraocular previsto está disponible y verificado', obligatorio: false },
  { clave: 'biometria', texto: 'La biometría corresponde a este paciente y a este ojo', obligatorio: true },
  { clave: 'antibiotico', texto: 'Se aplicó la profilaxis antibiótica cuando corresponde', obligatorio: false },
  { clave: 'eventos_criticos', texto: 'Se revisaron los pasos críticos y los riesgos previstos', obligatorio: true },
  { clave: 'esterilidad', texto: 'Enfermería confirmó la esterilidad del instrumental', obligatorio: true },
];

/** Antes de que el paciente salga de quirófano. */
export const SALIDA: Item[] = [
  { clave: 'procedimiento_registrado', texto: 'Se registró el procedimiento realizado', obligatorio: true },
  { clave: 'recuento', texto: 'El recuento de instrumental y gasas está completo', obligatorio: true },
  { clave: 'muestras', texto: 'Las muestras están rotuladas con nombre del paciente', obligatorio: false },
  { clave: 'implante_registrado', texto: 'El implante quedó registrado con lote y serie', obligatorio: false },
  { clave: 'problemas_equipo', texto: 'Se reportaron los problemas de equipo, si los hubo', obligatorio: false },
  { clave: 'recuperacion', texto: 'Se dieron las indicaciones de recuperación y control', obligatorio: true },
];

export const FASES = { ENTRADA, PAUSA, SALIDA } as const;
export type Fase = keyof typeof FASES;

/**
 * Devuelve los ítems obligatorios que faltan. Vacío = la fase puede cerrarse.
 *
 * Solo cuenta como respondido el `true` literal: un `"si"`, un `1` o un
 * `null` llegando desde un formulario mal armado no pueden pasar por
 * verificación cumplida.
 */
export function faltantes(fase: Fase, respuestas: Record<string, unknown>): string[] {
  return FASES[fase]
    .filter((i) => i.obligatorio && respuestas[i.clave] !== true)
    .map((i) => i.texto);
}
