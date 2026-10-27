/**
 * Teléfono colombiano a E.164.
 *
 * Existe porque el sitio público y WhatsApp tienen que llegar a la MISMA
 * persona. El gateway guarda `+573105149719` (ver `aE164` en el gateway); si
 * el formulario web guardara `310 514 9719`, la búsqueda por teléfono no
 * engancharía y el paciente que escribió por WhatsApp y luego llenó el
 * formulario quedaría duplicado. Duplicar personas es barato de hacer y caro
 * de deshacer: hay que fusionar conversaciones, citas y cobros.
 *
 * Devuelve null en vez de adivinar. Un teléfono mal guardado es un paciente
 * al que la clínica no puede llamar.
 */
export function aE164Colombia(entrada: string): string | null {
  const escrito = entrada.trim();
  const digitos = escrito.replace(/\D/g, '');
  if (!digitos) return null;

  // Lo escribió con indicativo de país: se respeta. Hay pacientes de fuera.
  if (escrito.startsWith('+')) {
    return digitos.length >= 8 && digitos.length <= 15 ? `+${digitos}` : null;
  }

  // Desde 2022 todo número nacional tiene diez dígitos: móvil 3XXXXXXXXX y
  // fijo con indicativo 60X XXX XXXX. Siete dígitos sueltos ya no marcan.
  if (digitos.length === 10) return `+57${digitos}`;
  if (digitos.length === 12 && digitos.startsWith('57')) return `+${digitos}`;
  // 0057... y 057..., como los escribe quien copia de una tarjeta.
  if (digitos.length >= 13 && digitos.length <= 14 && /^0+57/.test(digitos)) {
    return `+${digitos.replace(/^0+/, '')}`;
  }

  return null;
}
