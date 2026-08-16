import { PrismaClient } from '@prisma/client';

/**
 * El plazo de una PQRSF es legal: la Ley 1755 lo cuenta en días HÁBILES.
 *
 * Contar corridos produce una fecha que la clínica cree cumplir y no cumple
 * — y el error no se ve hasta que un ente de control pide el indicador de
 * oportunidad. Estas pruebas fijan el cálculo contra el calendario real de
 * festivos que ya se siembra.
 */
const hayBase = Boolean(process.env.DATABASE_URL);
(hayBase ? describe : describe.skip)('plazo en días hábiles', () => {
  const prisma = new PrismaClient();

  afterAll(() => prisma.$disconnect());

  /** Réplica exacta del cálculo del servicio, para probarlo con fechas fijas. */
  async function vencimiento(desde: Date, dias: number): Promise<string> {
    const festivos = new Set(
      (
        await prisma.holiday.findMany({
          where: { date: { gte: desde, lte: new Date(desde.getTime() + 120 * 86_400_000) } },
          select: { date: true },
        })
      ).map((f) => f.date.toISOString().slice(0, 10)),
    );

    const fecha = new Date(desde);
    let restantes = dias;
    while (restantes > 0) {
      fecha.setUTCDate(fecha.getUTCDate() + 1);
      const dow = fecha.getUTCDay();
      if (dow !== 0 && dow !== 6 && !festivos.has(fecha.toISOString().slice(0, 10))) restantes -= 1;
    }
    return fecha.toISOString().slice(0, 10);
  }

  it('salta el fin de semana', async () => {
    // Viernes 21 de agosto de 2026 + 1 hábil = lunes 24, no sábado 22.
    expect(await vencimiento(new Date('2026-08-21T00:00:00Z'), 1)).toBe('2026-08-24');
  });

  it('salta un festivo colombiano', async () => {
    // Viernes 14 de agosto + 1 hábil: el lunes 17 es Asunción de la Virgen,
    // así que cae el martes 18.
    expect(await vencimiento(new Date('2026-08-14T00:00:00Z'), 1)).toBe('2026-08-18');
  });

  it('quince días hábiles no son quince corridos', async () => {
    const habiles = await vencimiento(new Date('2026-08-14T00:00:00Z'), 15);
    const corridos = new Date('2026-08-29T00:00:00Z').toISOString().slice(0, 10);

    expect(habiles).not.toBe(corridos);
    // Con dos fines de semana y el festivo del 17, son al menos siete días
    // más de calendario. Prometer el 29 sería incumplir sin saberlo.
    expect(new Date(habiles).getTime()).toBeGreaterThan(new Date(corridos).getTime());
  });

  it('el resultado nunca cae en sábado, domingo ni festivo', async () => {
    const festivos = new Set(
      (await prisma.holiday.findMany({ select: { date: true } })).map((f) =>
        f.date.toISOString().slice(0, 10),
      ),
    );

    for (const inicio of ['2026-08-14', '2026-12-18', '2026-03-27', '2026-06-26']) {
      for (const dias of [1, 5, 15]) {
        const v = await vencimiento(new Date(`${inicio}T00:00:00Z`), dias);
        const dow = new Date(`${v}T00:00:00Z`).getUTCDay();
        expect({ inicio, dias, v, dow, festivo: festivos.has(v) }).toEqual({
          inicio,
          dias,
          v,
          dow,
          festivo: false,
        });
        expect(dow).not.toBe(0);
        expect(dow).not.toBe(6);
      }
    }
  });
});
