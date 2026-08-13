import { PrismaClient } from '@prisma/client';


/**
 * Comprobaciones que SOLO tienen sentido contra una base real: lo que se
 * verifica aquí son triggers, índices parciales y CHECK que viven en
 * PostgreSQL, no en el código. Un test unitario no puede decir si el
 * trigger está puesto.
 *
 *   npm run test:db --workspace apps/api
 *
 * Se salta si no hay DATABASE_URL, para que el CI sin base no falle.
 */
const hayBase = Boolean(process.env.DATABASE_URL);
const describeSiHayBase = hayBase ? describe : describe.skip;

describeSiHayBase('constraints en PostgreSQL', () => {
  const prisma = new PrismaClient();
  const creados: string[] = [];

  /**
   * La limpieza marca como borradas, no borra.
   *
   * No es pereza: `deleteMany` sobre `persons` cascadea a `data_consents`, y
   * el trigger append-only lo rechaza. O sea que **una persona con
   * consentimiento registrado no se puede borrar de la base**, ni aquí ni en
   * producción. Es exactamente lo que la Ley 1581 exige —la evidencia de que
   * autorizó tiene que sobrevivir—, así que el borrado lógico no es el atajo
   * del test: es el único borrado que existe en este sistema.
   */
  afterAll(async () => {
    if (creados.length) {
      await prisma.person.updateMany({
        where: { id: { in: creados } },
        data: { deletedAt: new Date(), tags: ['prueba-integracion'] },
      });
    }
    await prisma.$disconnect();
  });

  const persona = async (extra: Record<string, unknown> = {}) => {
    const p = await prisma.person.create({
      data: { firstName: 'Prueba', displayName: `Prueba ${Date.now()}${Math.round(1e6)}`, ...extra },
    });
    creados.push(p.id);
    return p;
  };

  it('las 4 extensiones están instaladas', async () => {
    const filas = await prisma.$queryRaw<{ extname: string }[]>`
      SELECT extname FROM pg_extension
      WHERE extname IN ('btree_gist', 'pg_trgm', 'unaccent', 'uuid-ossp')
      ORDER BY extname`;
    expect(filas.map((f) => f.extname)).toEqual(['btree_gist', 'pg_trgm', 'unaccent', 'uuid-ossp']);
  });

  it('audit_logs no se puede modificar ni borrar', async () => {
    const log = await prisma.auditLog.create({
      data: { action: 'CREATE', entityType: 'prueba' },
    });

    await expect(
      prisma.auditLog.update({ where: { id: log.id }, data: { entityType: 'alterado' } }),
    ).rejects.toThrow(/append-only/i);

    await expect(prisma.auditLog.delete({ where: { id: log.id } })).rejects.toThrow(/append-only/i);
  });

  it('un consentimiento se revoca, no se edita', async () => {
    const p = await persona();
    const c = await prisma.dataConsent.create({
      data: {
        personId: p.id,
        purpose: 'TRATAMIENTO_DATOS',
        granted: true,
        policyVersion: 'v1.0',
        channel: 'BAILEYS',
        evidenceText: 'Autorizo el tratamiento de mis datos.',
      },
    });

    // Revocar sí.
    await expect(
      prisma.dataConsent.update({ where: { id: c.id }, data: { revokedAt: new Date() } }),
    ).resolves.toBeDefined();

    // Reescribir la evidencia, no.
    await expect(
      prisma.dataConsent.update({ where: { id: c.id }, data: { evidenceText: 'Otra cosa' } }),
    ).rejects.toThrow(/no se edita/i);

    await expect(prisma.dataConsent.delete({ where: { id: c.id } })).rejects.toThrow(/append-only/i);
  });

  it('el índice de historia clínica es parcial: admite personas sin mrn', async () => {
    // Dos contactos de WhatsApp que nunca serán pacientes, ambos sin mrn.
    await persona();
    await persona();

    const mrn = `H-${Date.now()}`;
    await persona({ isPatient: true, mrn });
    // El mismo mrn en otro paciente sí colisiona.
    await expect(persona({ isPatient: true, mrn })).rejects.toThrow();
  });

  it('una persona no puede fusionarse consigo misma', async () => {
    const p = await persona();
    await expect(
      prisma.person.update({ where: { id: p.id }, data: { mergedIntoId: p.id } }),
    ).rejects.toThrow();
  });

  it('rechaza una disponibilidad con el fin antes del inicio', async () => {
    const sede = await prisma.site.findFirstOrThrow();
    const prof = await prisma.professional.create({
      data: {
        docNumber: `T${Date.now()}`,
        firstName: 'Ana',
        lastName: 'Prueba',
        displayName: 'Ana Prueba',
        type: 'OPTOMETRA',
      },
    });

    await expect(
      prisma.professionalAvailability.create({
        data: { professionalId: prof.id, siteId: sede.id, weekday: 1, startMinute: 600, endMinute: 480 },
      }),
    ).rejects.toThrow();

    await prisma.professional.delete({ where: { id: prof.id } });
  });

  it('el catálogo quedó sembrado completo', async () => {
    const porLinea = await prisma.service.groupBy({
      by: ['businessLine'],
      _count: true,
      orderBy: { businessLine: 'asc' },
    });
    expect(Object.fromEntries(porLinea.map((l) => [l.businessLine, l._count]))).toEqual({
      CIRUGIA: 9,
      CONSULTA: 17,
      EMPRESAS: 1,
      ESTETICA: 1,
      EXAMEN: 15,
      OPTICA: 1,
    });

    expect(await prisma.site.count()).toBe(3);
    // 18 por año menos la colisión de 2030, que no está en el rango sembrado.
    expect(await prisma.holiday.count()).toBeGreaterThanOrEqual(54);
  });
});
