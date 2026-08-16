export type Tramo = 'alDia' | 'd1a30' | 'd31a60' | 'd61a90' | 'mas90';

/**
 * Clasificación de un saldo por edad de vencimiento.
 *
 * Está aparte para poder probar los bordes. Los tramos de cartera son un
 * clásico del error por uno: el día 30 pertenece a "1 a 30" y el 31 a "31 a
 * 60", y equivocarse mueve dinero de un cajón a otro justo en el reporte que
 * la gerencia usa para decidir a quién cobrar.
 *
 * `dias` es lo que lleva VENCIDA: cero o negativo significa que aún no vence.
 */
export function tramoDe(dias: number): Tramo {
  if (dias <= 0) return 'alDia';
  if (dias <= 30) return 'd1a30';
  if (dias <= 60) return 'd31a60';
  if (dias <= 90) return 'd61a90';
  return 'mas90';
}

/** Días vencidos a una fecha dada. Sin `dueDate` no hay reloj: cero. */
export function diasVencida(dueDate: Date | null, ahora: Date): number {
  if (!dueDate) return 0;
  return Math.floor((ahora.getTime() - dueDate.getTime()) / 86_400_000);
}
