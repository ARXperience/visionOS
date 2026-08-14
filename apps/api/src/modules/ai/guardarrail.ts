/**
 * Filtro de seguridad del asistente.
 *
 * Existe porque el prompt NO es un mecanismo de seguridad. Un prompt se
 * puede rodear con la pregunta adecuada, cambia de comportamiento al
 * actualizar el modelo, y nadie se entera hasta que un paciente sigue un
 * consejo que le dio un programa.
 *
 * Estas reglas corren DESPUÉS del modelo, sobre el texto que iba a salir, y
 * son deterministas: se pueden probar sin gastar un token y no dependen de
 * que el proveedor esté teniendo un buen día.
 *
 * La regla de fondo: el asistente informa y agenda. No diagnostica, no
 * recomienda tratamiento, no interpreta un síntoma y no dice si algo es
 * grave. Ante cualquier duda, escala a una persona — el coste de escalar de
 * más es una recepcionista leyendo un mensaje; el de escalar de menos es un
 * paciente con un problema ocular esperando en casa.
 */

/** Lo que el paciente escribe y obliga a que lo lea un humano. */
const SINTOMA = new RegExp(
  [
    'me duele',
    'dolor (de|en) (ojo|ojos|cabeza|vista)',
    'no veo',
    'veo (borroso|doble|manchas|luces|nublado)',
    'perd[íi] (la )?visi[óo]n',
    'visi[óo]n borrosa',
    'ojo rojo',
    'sangre',
    'sangrado',
    'golpe en el ojo',
    // Sin restringir qué cayó: la lista de sustancias siempre se queda
    // corta, y aquí equivocarse por exceso solo cuesta que lo lea una
    // persona.
    'me cay[óo]',
    // Con í, no con é. La primera versión escribía `qu[ée]mica` y dejaba
    // pasar "me cayó una química en el ojo" — lo encontró esta prueba.
    'qu[íi]mic[oa]',
    'no puedo abrir el ojo',
    'destellos',
    'moscas volantes',
    'cortina',
    'urgencia',
    'urgente',
    'emergencia',
    'qu[ée] me tomo',
    'qu[ée] me pongo',
    'qu[ée] gotas',
    'puedo tomar',
    'es grave',
  ].join('|'),
  'i',
);

/** Lo que el asistente NO puede decir, aunque el modelo lo genere. */
const CONSEJO_CLINICO = new RegExp(
  [
    'le recomiendo (que )?(use|tome|aplique|se ponga)',
    'deber[íi]a (usar|tomar|aplicar|ponerse)',
    'p[óo]ngase',
    't[óo]mese',
    'apl[íi]quese',
    'use (gotas|lagrimas|l[áa]grimas|colirio)',
    'es (probable|posible) que (tenga|sufra|padezca)',
    'parece (ser )?(un|una)? ?(conjuntivitis|glaucoma|catarata|orzuelo|infecci[óo]n)',
    'no es grave',
    'no se preocupe',
    'puede esperar',
    'mientras tanto (use|tome|aplique)',
    'suele (pasar|ser normal)',
    'es normal que',
  ].join('|'),
  'i',
);

export interface Veredicto {
  /** true = no se envía y la conversación pasa a un humano. */
  escalar: boolean;
  motivo?: string;
}

/**
 * ¿Este mensaje del paciente exige una persona?
 *
 * Se evalúa ANTES de llamar al modelo: si hay síntoma, ni siquiera se gasta
 * una llamada. Es más barato y, sobre todo, elimina la posibilidad de que el
 * modelo conteste algo antes de que nadie lo revise.
 */
export function exigeHumano(mensaje: string): Veredicto {
  const m = SINTOMA.exec(mensaje);
  return m
    ? { escalar: true, motivo: `El paciente menciona un síntoma o urgencia: "${m[0]}"` }
    : { escalar: false };
}

/**
 * ¿Lo que el modelo quiere responder se puede enviar?
 *
 * Corre siempre, incluso cuando el mensaje entrante parecía inocente: la
 * pregunta "¿cuánto cuesta la consulta?" puede terminar en una respuesta que
 * opine sobre un síntoma mencionado de pasada.
 */
export function puedeEnviarse(respuesta: string): Veredicto {
  const m = CONSEJO_CLINICO.exec(respuesta);
  return m
    ? { escalar: true, motivo: `La respuesta contiene consejo clínico: "${m[0]}"` }
    : { escalar: false };
}

/**
 * Lo que se le dice al paciente cuando se escala.
 *
 * Ni promete un tiempo que la clínica no puede cumplir ni deja al paciente
 * sin saber qué hacer si de verdad es una urgencia.
 */
export const MENSAJE_ESCALADO =
  'Para responderle bien sobre eso prefiero pasarle con una persona del equipo, ' +
  'que le escribe en cuanto pueda dentro del horario de atención.\n\n' +
  'Si es algo urgente —dolor fuerte, pérdida repentina de visión, un golpe o un ' +
  'químico en el ojo— por favor llámenos al (601) 745 5472 o acuda al servicio de ' +
  'urgencias más cercano.';

/**
 * El asistente nunca se hace pasar por una persona.
 *
 * Sonar humano —esperar antes de responder, escribir en dos burbujas— no es
 * lo mismo que mentir sobre lo que se es. Si preguntan, se dice.
 */
const PREGUNTA_SI_ES_BOT =
  /(eres|sos|es) (un |una )?(bot|robot|m[áa]quina|inteligencia artificial|ia|programa)|hablo con (una persona|alguien|un humano)|est[áa]s? ah[íi]\?|qui[ée]n (eres|habla)/i;

export function preguntaSiEsBot(mensaje: string): boolean {
  return PREGUNTA_SI_ES_BOT.test(mensaje);
}

export const RESPUESTA_SOY_ASISTENTE =
  'Soy el asistente virtual de Visión Colombia. Puedo darle información sobre ' +
  'nuestros servicios y agendarle una cita; para cualquier otra cosa le paso con ' +
  'una persona del equipo.';
