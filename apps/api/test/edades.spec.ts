import { diasVencida, tramoDe } from '../src/modules/billing/edades';

/**
 * Los tramos de cartera son un clásico del error por uno, y equivocarse mueve
 * dinero de un cajón a otro en el reporte que la gerencia usa para decidir a
 * quién cobrar.
 */
describe('cartera por edades', () => {
  it('los bordes caen donde deben', () => {
    expect(tramoDe(-5)).toBe('alDia');
    expect(tramoDe(0)).toBe('alDia');
    expect(tramoDe(1)).toBe('d1a30');
    expect(tramoDe(30)).toBe('d1a30');
    expect(tramoDe(31)).toBe('d31a60');
    expect(tramoDe(60)).toBe('d31a60');
    expect(tramoDe(61)).toBe('d61a90');
    expect(tramoDe(90)).toBe('d61a90');
    expect(tramoDe(91)).toBe('mas90');
    expect(tramoDe(1000)).toBe('mas90');
  });

  it('sin fecha de vencimiento no corre el reloj', () => {
    expect(diasVencida(null, new Date('2026-08-16T00:00:00Z'))).toBe(0);
  });

  it('cuenta los días completos, no las horas', () => {
    const vence = new Date('2026-08-01T00:00:00Z');
    expect(diasVencida(vence, new Date('2026-08-01T23:59:00Z'))).toBe(0);
    expect(diasVencida(vence, new Date('2026-08-02T00:00:00Z'))).toBe(1);
    expect(diasVencida(vence, new Date('2026-08-31T12:00:00Z'))).toBe(30);
    expect(diasVencida(vence, new Date('2026-09-01T00:00:00Z'))).toBe(31);
  });

  it('una factura que vence hoy no está vencida', () => {
    const ahora = new Date('2026-08-16T15:00:00Z');
    expect(tramoDe(diasVencida(new Date('2026-08-16T00:00:00Z'), ahora))).toBe('alDia');
  });
});
