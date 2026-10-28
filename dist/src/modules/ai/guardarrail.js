"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RESPUESTA_SOY_ASISTENTE = exports.MENSAJE_ESCALADO = void 0;
exports.exigeHumano = exigeHumano;
exports.puedeEnviarse = puedeEnviarse;
exports.preguntaSiEsBot = preguntaSiEsBot;
const SINTOMA = new RegExp([
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
    'me cay[óo]',
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
].join('|'), 'i');
const CONSEJO_CLINICO = new RegExp([
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
].join('|'), 'i');
function exigeHumano(mensaje) {
    const m = SINTOMA.exec(mensaje);
    return m
        ? { escalar: true, motivo: `El paciente menciona un síntoma o urgencia: "${m[0]}"` }
        : { escalar: false };
}
function puedeEnviarse(respuesta) {
    const m = CONSEJO_CLINICO.exec(respuesta);
    return m
        ? { escalar: true, motivo: `La respuesta contiene consejo clínico: "${m[0]}"` }
        : { escalar: false };
}
exports.MENSAJE_ESCALADO = 'Para responderle bien sobre eso prefiero pasarle con una persona del equipo, ' +
    'que le escribe en cuanto pueda dentro del horario de atención.\n\n' +
    'Si es algo urgente —dolor fuerte, pérdida repentina de visión, un golpe o un ' +
    'químico en el ojo— por favor llámenos al (601) 745 5472 o acuda al servicio de ' +
    'urgencias más cercano.';
const PREGUNTA_SI_ES_BOT = /(eres|sos|es) (un |una )?(bot|robot|m[áa]quina|inteligencia artificial|ia|programa)|hablo con (una persona|alguien|un humano)|est[áa]s? ah[íi]\?|qui[ée]n (eres|habla)/i;
function preguntaSiEsBot(mensaje) {
    return PREGUNTA_SI_ES_BOT.test(mensaje);
}
exports.RESPUESTA_SOY_ASISTENTE = 'Soy el asistente virtual de Visión Colombia. Puedo darle información sobre ' +
    'nuestros servicios y agendarle una cita; para cualquier otra cosa le paso con ' +
    'una persona del equipo.';
//# sourceMappingURL=guardarrail.js.map