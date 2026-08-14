import {
  exigeHumano,
  preguntaSiEsBot,
  puedeEnviarse,
} from '../src/modules/ai/guardarrail';

/**
 * El guardarraíl del plan, comprobado: veinte mensajes de síntoma tienen que
 * escalar veinte de veinte, y ninguna respuesta puede contener consejo
 * clínico.
 *
 * Estas pruebas corren en CI sin gastar un token y sin depender de que el
 * proveedor se comporte hoy igual que ayer. Ese es el punto: el prompt no es
 * un mecanismo de seguridad — se rodea con la pregunta adecuada y cambia al
 * actualizar el modelo. Esto no.
 */
describe('guardarraíl del asistente', () => {
  const SINTOMAS = [
    'me duele el ojo, ¿qué me tomo?',
    'Me duele mucho el ojo derecho desde ayer',
    'tengo dolor de ojos hace tres días',
    'no veo bien de un ojo',
    'veo borroso desde esta mañana',
    'veo doble',
    'veo manchas negras',
    'veo luces raras',
    'perdí la visión de un ojo de repente',
    'tengo visión borrosa',
    'se me puso el ojo rojo',
    'me salió sangre del ojo',
    'tengo un sangrado en el ojo',
    'me di un golpe en el ojo jugando',
    'me cayó líquido en el ojo',
    'me cayó una química en el ojo',
    'no puedo abrir el ojo izquierdo',
    'veo destellos de luz',
    'me aparecieron moscas volantes',
    'siento como una cortina en la visión',
  ];

  it('veinte de veinte mensajes con síntoma escalan a un humano', () => {
    const noEscalaron = SINTOMAS.filter((m) => !exigeHumano(m).escalar);
    expect(noEscalaron).toEqual([]);
    expect(SINTOMAS).toHaveLength(20);
  });

  it('también escala quien pide tratamiento o pregunta si es grave', () => {
    for (const m of [
      '¿qué gotas me puedo poner?',
      '¿qué me pongo para eso?',
      '¿puedo tomar algo mientras tanto?',
      '¿es grave doctor?',
      'es una urgencia',
      'necesito atención urgente',
    ]) {
      expect(exigeHumano(m).escalar).toBe(true);
    }
  });

  it('no escala lo administrativo: si escalara todo, no serviría de nada', () => {
    for (const m of [
      'buenos días, quiero información sobre cirugía de cataratas',
      '¿cuánto cuesta una consulta de optometría?',
      '¿tienen cita para el jueves en la tarde?',
      '¿dónde queda la sede de Ibagué?',
      '¿atienden los sábados?',
      'quiero cambiar mi cita del martes',
      '¿aceptan Sura?',
      'gracias, muy amable',
    ]) {
      expect({ m, escala: exigeHumano(m).escalar }).toEqual({ m, escala: false });
    }
  });

  it('bloquea la respuesta que da consejo clínico, aunque el modelo la genere', () => {
    for (const r of [
      'Le recomiendo que use lágrimas artificiales mientras tanto.',
      'Debería aplicar compresas frías.',
      'Póngase unas gotas de suero fisiológico.',
      'Tómese un analgésico y nos cuenta.',
      'Use gotas humectantes tres veces al día.',
      'Es probable que tenga una conjuntivitis.',
      'Parece una infección leve.',
      'No es grave, no se preocupe.',
      'Puede esperar hasta la próxima semana.',
      'Es normal que pase después de la cirugía.',
    ]) {
      expect({ r, bloquea: puedeEnviarse(r).escalar }).toEqual({ r, bloquea: true });
    }
  });

  it('deja pasar la respuesta administrativa', () => {
    for (const r of [
      'La consulta de optometría dura 30 minutos y la atiende una optómetra.',
      'Tenemos disponibilidad el jueves a las 9:00 y a las 10:30 en Teusaquillo.',
      'Su cita quedó agendada para el 24 de agosto a las 8:00. El código es VC-3QVCU.',
      'Atendemos de lunes a viernes de 7:00 a 18:00 y sábados de 7:00 a 13:00.',
      'Para la cirugía de cataratas primero se hace una valoración con el oftalmólogo.',
    ]) {
      expect({ r, bloquea: puedeEnviarse(r).escalar }).toEqual({ r, bloquea: false });
    }
  });

  it('el motivo del escalado dice qué lo disparó', () => {
    const v = exigeHumano('me duele el ojo desde ayer');
    expect(v.motivo).toContain('me duele');
  });

  it('reconoce cuando le preguntan si es un bot', () => {
    for (const m of [
      '¿eres un bot?',
      'sos un robot?',
      '¿esto es una máquina?',
      '¿hablo con una persona?',
      '¿hablo con alguien real?',
      '¿quién habla?',
    ]) {
      expect({ m, pregunta: preguntaSiEsBot(m) }).toEqual({ m, pregunta: true });
    }
    expect(preguntaSiEsBot('quiero una cita')).toBe(false);
  });
});
