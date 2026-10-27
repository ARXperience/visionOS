import { aE164Colombia } from '../src/common/utils/telefono.util';

/**
 * El caso que importa es el primero: el número que el paciente escribe en el
 * formulario web tiene que quedar EXACTAMENTE igual que el que el gateway
 * deriva del JID de WhatsApp, o la misma persona entra dos veces.
 */
describe('aE164Colombia', () => {
  it('normaliza al mismo valor que produce el gateway desde el JID', () => {
    const desdeWhatsapp = `+${'573105149719@s.whatsapp.net'.split('@')[0].replace(/\D/g, '')}`;

    for (const escrito of ['3105149719', '310 514 9719', '310-514-9719', '+57 310 514 9719', '573105149719']) {
      expect(aE164Colombia(escrito)).toBe(desdeWhatsapp);
    }
  });

  it('acepta el fijo de diez dígitos con indicativo', () => {
    expect(aE164Colombia('(601) 745 5472')).toBe('+576017455472');
  });

  it('acepta el internacional escrito con +', () => {
    expect(aE164Colombia('+1 305 555 0111')).toBe('+13055550111');
  });

  it('rechaza en vez de adivinar', () => {
    // Siete dígitos es el fijo viejo: desde 2022 no marca, y completarlo a
    // mano inventaría un número al que la clínica llamaría en vano.
    expect(aE164Colombia('7455472')).toBeNull();
    expect(aE164Colombia('')).toBeNull();
    expect(aE164Colombia('no es un teléfono')).toBeNull();
  });
});
