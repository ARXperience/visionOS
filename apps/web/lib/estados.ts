/**
 * Etiquetas y color de cada estado del recorrido del paciente.
 *
 * Vive aquí y no en la página de agenda porque recepción lo necesita igual,
 * y una página de Next solo puede exportar su componente por defecto.
 */
export const ESTADOS: Record<string, { texto: string; clase: string }> = {
  PROGRAMADA: { texto: 'Programada', clase: 'planeado' },
  CONFIRMADA: { texto: 'Confirmada', clase: 'disponible' },
  LLEGO: { texto: 'Llegó', clase: 'construccion' },
  EN_ADMISION: { texto: 'En admisión', clase: 'construccion' },
  EN_ESPERA: { texto: 'En espera', clase: 'construccion' },
  EN_ATENCION: { texto: 'En atención', clase: 'disponible' },
  EN_PROCEDIMIENTO: { texto: 'En procedimiento', clase: 'disponible' },
  PARA_FACTURAR: { texto: 'Para facturar', clase: 'construccion' },
  FINALIZADA: { texto: 'Finalizada', clase: 'planeado' },
  NO_ASISTIO: { texto: 'No asistió', clase: 'peligro' },
  CANCELADA: { texto: 'Cancelada', clase: 'peligro' },
};

export const hora = (iso: string) =>
  new Date(iso).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
