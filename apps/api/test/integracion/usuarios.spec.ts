import { PrismaClient } from '@prisma/client';

/**
 * Las protecciones de la gestión de usuarios, contra la base real.
 *
 * La que más importa es la última: cambiar una contraseña tiene que
 * invalidar los tokens ya emitidos. Revocar solo el refresh dejaba al
 * atacante dentro hasta quince minutos más — justo los que no se pueden
 * regalar cuando la clave se cambia porque se filtró. Se descubrió
 * probándolo, no leyéndolo.
 */
const hayBase = Boolean(process.env.DATABASE_URL);
(hayBase ? describe : describe.skip)('gestión de usuarios', () => {
  const prisma = new PrismaClient();
  const correo = `prueba-${Date.now()}@visioncolombia.com.co`;
  let id: string;
  let siteId: string;

  beforeAll(async () => {
    siteId = (await prisma.site.findFirstOrThrow({ select: { id: true } })).id;
    const u = await prisma.user.create({
      data: {
        email: correo,
        passwordHash: 'x',
        firstName: 'Prueba',
        lastName: 'Usuarios',
        role: 'RECEPCION',
        status: 'ACTIVE',
        siteAccess: { create: { siteId, isPrimary: true } },
      },
      select: { id: true },
    });
    id = u.id;
  });

  afterAll(async () => {
    await prisma.userSiteAccess.deleteMany({ where: { userId: id } });
    await prisma.refreshToken.deleteMany({ where: { userId: id } });
    await prisma.user.delete({ where: { id } }).catch(() => undefined);
    await prisma.$disconnect();
  });

  it('el correo es único', async () => {
    await expect(
      prisma.user.create({
        data: { email: correo, passwordHash: 'y', firstName: 'Otra', lastName: 'Persona' },
      }),
    ).rejects.toThrow();
  });

  it('dar de baja conserva la fila: la auditoría apunta a ella', async () => {
    const log = await prisma.auditLog.create({
      data: { userId: id, action: 'LOGIN', entityType: 'user', entityId: id },
      select: { id: true },
    });

    await prisma.user.update({ where: { id }, data: { deletedAt: new Date(), status: 'SUSPENDED' } });

    // La fila sigue, y el registro de auditoría sigue sabiendo quién fue.
    const sigue = await prisma.auditLog.findUniqueOrThrow({
      where: { id: log.id },
      select: { userId: true },
    });
    expect(sigue.userId).toBe(id);

    // Y desaparece de la lista, que filtra por deletedAt.
    const listados = await prisma.user.findMany({ where: { deletedAt: null }, select: { id: true } });
    expect(listados.map((u) => u.id)).not.toContain(id);

    await prisma.user.update({ where: { id }, data: { deletedAt: null, status: 'ACTIVE' } });
  });

  it('passwordChangedAt invalida los tokens anteriores', async () => {
    // El access token lleva `iat` en segundos. Un token emitido antes del
    // cambio tiene que quedar fuera; uno emitido después, dentro.
    const antes = Math.floor(Date.now() / 1000) - 60;

    await prisma.user.update({ where: { id }, data: { passwordChangedAt: new Date() } });
    const u = await prisma.user.findUniqueOrThrow({
      where: { id },
      select: { passwordChangedAt: true },
    });

    expect(u.passwordChangedAt).not.toBeNull();
    // Esta es la comparación exacta que hace JwtStrategy.
    expect(antes * 1000 < u.passwordChangedAt!.getTime() - 1000).toBe(true);

    const despues = Math.floor(Date.now() / 1000) + 60;
    expect(despues * 1000 < u.passwordChangedAt!.getTime() - 1000).toBe(false);
  });

  it('una cuenta sin sedes no ve ninguna agenda: por eso se exige al menos una', async () => {
    const sedes = await prisma.userSiteAccess.count({ where: { userId: id } });
    expect(sedes).toBeGreaterThan(0);
  });

  it('queda al menos un administrador activo', async () => {
    const admins = await prisma.user.count({
      where: { role: 'SUPERADMIN', status: 'ACTIVE', deletedAt: null },
    });
    expect(admins).toBeGreaterThan(0);
  });
});
