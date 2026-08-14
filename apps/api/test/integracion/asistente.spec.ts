import { PrismaClient } from '@prisma/client';

/**
 * El prompt es la única palanca para corregir al asistente cuando empieza a
 * decir cosas raras a los pacientes. Estas dos garantías son lo que hace que
 * esa palanca sirva:
 *
 *  - una sola versión activa, o el asistente responde distinto según el
 *    orden que devuelva la consulta y es imposible de depurar;
 *  - una versión publicada no se edita, o `ai_runs` apuntaría a un texto que
 *    ya no es el que produjo esa respuesta.
 */
const hayBase = Boolean(process.env.DATABASE_URL);
(hayBase ? describe : describe.skip)('prompts del asistente', () => {
  const prisma = new PrismaClient();
  const slug = `prueba-${Date.now()}`;
  let v1: string;

  afterAll(async () => {
    await prisma.aiPrompt.deleteMany({ where: { slug } });
    await prisma.$disconnect();
  });

  it('publica una versión y la activa', async () => {
    const p = await prisma.aiPrompt.create({
      data: { slug, version: 1, content: 'Contenido de la versión uno.', isActive: true },
      select: { id: true, isActive: true },
    });
    v1 = p.id;
    expect(p.isActive).toBe(true);
  });

  it('no admite dos versiones activas del mismo propósito', async () => {
    await expect(
      prisma.aiPrompt.create({
        data: { slug, version: 2, content: 'Contenido de la versión dos.', isActive: true },
      }),
    ).rejects.toThrow();
  });

  it('una versión publicada no se puede editar: se publica otra', async () => {
    await expect(
      prisma.aiPrompt.update({ where: { id: v1 }, data: { content: 'Reescrito a mano' } }),
    ).rejects.toThrow(/no se edita/i);
  });

  it('pero sí se puede desactivar y activar otra: eso es el rollback', async () => {
    await prisma.aiPrompt.update({ where: { id: v1 }, data: { isActive: false } });
    const v2 = await prisma.aiPrompt.create({
      data: { slug, version: 2, content: 'Contenido de la versión dos.', isActive: true },
      select: { id: true },
    });

    // Volver atrás: apagar la 2 y encender la 1.
    await prisma.aiPrompt.update({ where: { id: v2.id }, data: { isActive: false } });
    await prisma.aiPrompt.update({ where: { id: v1 }, data: { isActive: true } });

    const activos = await prisma.aiPrompt.findMany({ where: { slug, isActive: true } });
    expect(activos).toHaveLength(1);
    expect(activos[0].version).toBe(1);
  });

  it('hay un prompt de atención activo, sembrado', async () => {
    const p = await prisma.aiPrompt.findFirst({
      where: { slug: 'atencion', isActive: true },
      select: { content: true },
    });
    expect(p).not.toBeNull();
    // Lo que no puede faltar en ninguna versión: que escale ante síntomas y
    // que no oculte que es un asistente.
    expect(p!.content).toMatch(/escalar_a_humano/);
    expect(p!.content).toMatch(/asistente virtual/i);
    expect(p!.content).toMatch(/No das consejo médico/i);
  });
});
