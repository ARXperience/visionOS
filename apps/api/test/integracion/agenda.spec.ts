import { PrismaClient } from '@prisma/client';

import { enZona } from '../../src/modules/appointments/availability.service';

/**
 * La agenda es el único sitio donde un fallo de concurrencia se traduce en
 * dos pacientes sentados frente al mismo médico a la misma hora. Estas
 * pruebas van contra PostgreSQL porque lo que se comprueba es el EXCLUDE, y
 * un test unitario no puede decir si el constraint está puesto.
 */
const hayBase = Boolean(process.env.DATABASE_URL);
const siHayBase = hayBase ? describe : describe.skip;

siHayBase('agenda: sin doble reserva', () => {
  const prisma = new PrismaClient();
  const creados: string[] = [];
  let siteId: string;
  let profId: string;
  let salaId: string;

  beforeAll(async () => {
    siteId = (await prisma.site.findFirstOrThrow({ select: { id: true } })).id;

    const p = await prisma.professional.create({
      data: {
        docNumber: `AG${Date.now()}`,
        firstName: 'Prueba',
        lastName: 'Agenda',
        displayName: 'Dr. Prueba Agenda',
        type: 'OFTALMOLOGO',
      },
      select: { id: true },
    });
    profId = p.id;

    const s = await prisma.room.create({
      data: { siteId, code: `AG-${Date.now()}`, name: 'Consultorio de prueba' },
      select: { id: true },
    });
    salaId = s.id;
  });

  afterAll(async () => {
    await prisma.resourceBooking.deleteMany({ where: { professionalId: profId } });
    await prisma.appointment.deleteMany({ where: { id: { in: creados } } });
    await prisma.room.delete({ where: { id: salaId } }).catch(() => undefined);
    await prisma.professional.delete({ where: { id: profId } }).catch(() => undefined);
    await prisma.$disconnect();
  });

  const reserva = (inicio: string, fin: string, recurso = profId) =>
    prisma.resourceBooking.create({
      data: {
        siteId,
        kind: recurso === salaId ? 'ROOM' : 'PROFESSIONAL',
        ...(recurso === salaId ? { roomId: recurso } : { professionalId: recurso }),
        startsAt: new Date(inicio),
        endsAt: new Date(fin),
      },
      select: { id: true },
    });

  it('rechaza dos reservas solapadas del mismo profesional', async () => {
    await reserva('2030-03-04T14:00:00Z', '2030-03-04T14:30:00Z');
    await expect(reserva('2030-03-04T14:15:00Z', '2030-03-04T14:45:00Z')).rejects.toThrow();
  });

  it('permite citas consecutivas: 9:00–9:30 y 9:30–10:00 no se solapan', async () => {
    // El rango es '[)': inicio incluido, fin excluido. Si fuera '[]', la
    // agenda rechazaría la cita siguiente y nadie entendería por qué.
    await reserva('2030-03-05T14:00:00Z', '2030-03-05T14:30:00Z');
    await expect(reserva('2030-03-05T14:30:00Z', '2030-03-05T15:00:00Z')).resolves.toBeDefined();
  });

  it('dos escrituras CONCURRENTES: una entra, la otra falla', async () => {
    // El caso real: dos recepcionistas confirmando el mismo cupo a la vez.
    // Si esto pasara, el sistema tendría dos pacientes a la misma hora.
    const a = reserva('2030-03-06T14:00:00Z', '2030-03-06T14:30:00Z');
    const b = reserva('2030-03-06T14:10:00Z', '2030-03-06T14:40:00Z');

    const r = await Promise.allSettled([a, b]);
    const ok = r.filter((x) => x.status === 'fulfilled');
    const fallo = r.filter((x) => x.status === 'rejected');

    expect(ok).toHaveLength(1);
    expect(fallo).toHaveLength(1);
    expect(String((fallo[0] as PromiseRejectedResult).reason)).toContain('23P01');
  });

  it('cancelar libera el cupo: active=false lo saca del constraint', async () => {
    const r = await reserva('2030-03-07T14:00:00Z', '2030-03-07T14:30:00Z');
    await expect(reserva('2030-03-07T14:00:00Z', '2030-03-07T14:30:00Z')).rejects.toThrow();

    await prisma.resourceBooking.update({ where: { id: r.id }, data: { active: false } });
    await expect(reserva('2030-03-07T14:00:00Z', '2030-03-07T14:30:00Z')).resolves.toBeDefined();
  });

  it('un bloqueo sin cita ocupa igual: vacaciones y mantenimiento', async () => {
    await prisma.resourceBooking.create({
      data: {
        siteId,
        kind: 'PROFESSIONAL',
        professionalId: profId,
        startsAt: new Date('2030-03-08T13:00:00Z'),
        endsAt: new Date('2030-03-08T22:00:00Z'),
        blockReason: 'Vacaciones',
      },
    });
    // Sin appointmentId, pero el mismo EXCLUDE lo protege: cero código extra.
    await expect(reserva('2030-03-08T15:00:00Z', '2030-03-08T15:30:00Z')).rejects.toThrow();
  });

  it('recursos distintos a la misma hora sí conviven', async () => {
    await reserva('2030-03-09T14:00:00Z', '2030-03-09T14:30:00Z');
    // El mismo rango en la sala: es otro recurso, no hay conflicto.
    await expect(reserva('2030-03-09T14:00:00Z', '2030-03-09T14:30:00Z', salaId)).resolves.toBeDefined();
  });

  it('rechaza una reserva con dos recursos o con ninguno', async () => {
    const base = { siteId, startsAt: new Date('2030-03-10T14:00:00Z'), endsAt: new Date('2030-03-10T14:30:00Z') };
    await expect(
      prisma.resourceBooking.create({
        data: { ...base, kind: 'PROFESSIONAL', professionalId: profId, roomId: salaId },
      }),
    ).rejects.toThrow();
    await expect(
      prisma.resourceBooking.create({ data: { ...base, kind: 'PROFESSIONAL' } }),
    ).rejects.toThrow();
  });

  it('rechaza que el tipo no coincida con el recurso llenado', async () => {
    await expect(
      prisma.resourceBooking.create({
        data: {
          siteId,
          kind: 'ROOM',
          professionalId: profId,
          startsAt: new Date('2030-03-11T14:00:00Z'),
          endsAt: new Date('2030-03-11T14:30:00Z'),
        },
      }),
    ).rejects.toThrow();
  });

  it('rechaza un rango invertido', async () => {
    await expect(reserva('2030-03-12T15:00:00Z', '2030-03-12T14:00:00Z')).rejects.toThrow();
  });
});

describe('conversión de hora local de la sede', () => {
  it('08:00 en Bogotá son las 13:00 UTC', () => {
    // Colombia es UTC-5 fijo. Si esto se rompe, las citas salen movidas
    // cinco horas y nadie lo nota hasta que llega el primer paciente.
    expect(enZona('2026-08-20', 480, 'America/Bogota').toISOString()).toBe(
      '2026-08-20T13:00:00.000Z',
    );
    expect(enZona('2026-08-20', 1080, 'America/Bogota').toISOString()).toBe(
      '2026-08-20T23:00:00.000Z',
    );
  });
});
