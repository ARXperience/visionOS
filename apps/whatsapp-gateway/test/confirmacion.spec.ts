import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { interpretar } from '../src/confirmacion.js';

/**
 * Este intérprete decide si un cupo se libera o no. Los dos errores tienen
 * consecuencias distintas y ninguna es aceptable:
 *
 *  - tomar "no puedo ir" por una confirmación deja un cupo muerto y un
 *    paciente que cree que canceló;
 *  - tomar "sí, ya la cancelé" por una confirmación revive una cita
 *    cancelada.
 *
 * Ante la duda NO se actúa: el mensaje se queda en el inbox para una
 * persona. Por eso hay tantos casos de "no interpreta".
 */
describe('interpretación de la respuesta al recordatorio', () => {
  it('reconoce la confirmación', () => {
    for (const t of ['1', 'sí', 'si', 'SI', 'confirmo', 'Confirmado', 'ok', 'dale', 'listo', 'voy', ' 1 ', 'Sí.']) {
      assert.equal(interpretar(t), 'CONFIRMA', `debería confirmar: ${t}`);
    }
  });

  it('reconoce la cancelación', () => {
    for (const t of ['2', 'no', 'NO', 'cancelo', 'Cancelar', 'no puedo', 'no voy', ' 2 ', 'no.']) {
      assert.equal(interpretar(t), 'CANCELA', `debería cancelar: ${t}`);
    }
  });

  it('NO interpreta lo ambiguo: se queda para una persona', () => {
    for (const t of [
      'no sé si pueda',
      'sí pero puedo llegar más tarde?',
      'no me quedó claro, confirmo mañana',
      '1 pregunta: ¿tengo que ir en ayunas?',
      'ok pero necesito cambiar la hora',
      'gracias',
      'buenos días',
      '',
      null,
      // El caso peligroso: contiene "sí" y contiene "cancelé".
      'sí, ya la cancelé',
    ]) {
      assert.equal(interpretar(t), null, `no debería interpretar: ${String(t)}`);
    }
  });

  it('un número distinto de 1 o 2 no significa nada', () => {
    for (const t of ['3', '0', '11', '12']) {
      assert.equal(interpretar(t), null, `no debería interpretar: ${t}`);
    }
  });
});
