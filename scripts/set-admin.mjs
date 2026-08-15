/**
 * Crea o actualiza la cuenta de administrador.
 *
 *   node scripts/set-admin.mjs correo@dominio.com "contraseña"
 *
 * Existe para no tener que tocar la base a mano ni dejar credenciales
 * escritas en el repositorio. Las que se pasan por argumento quedan en el
 * historial del terminal: conviene cambiarlas desde el panel en cuanto haya
 * uno, y no reutilizarlas en ningún otro sitio.
 *
 * Si el correo ya existe, actualiza su contraseña. Si no, crea la cuenta con
 * rol SUPERADMIN y acceso a todas las sedes.
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const env = join(import.meta.dirname, '..', 'apps', 'api', '.env');
if (existsSync(env)) {
  for (const l of readFileSync(env, 'utf8').split(/\r?\n/)) {
    const m = /^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/i.exec(l);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].trim();
  }
}

const [correo, clave] = process.argv.slice(2);

if (!correo || !clave) {
  console.error('Uso: node scripts/set-admin.mjs correo@dominio.com "contraseña"');
  process.exit(1);
}
if (clave.length < 8) {
  console.error('La contraseña debe tener al menos 8 caracteres.');
  process.exit(1);
}

// Aviso, no bloqueo: la decisión es de quien administra el sistema.
const debil =
  clave.length < 12 ||
  /^[a-zA-Z]+\d{2,4}$/.test(clave) ||
  /(clave|password|admin|soporte|1234)/i.test(clave);

const prisma = new PrismaClient();
// 12 rondas, las mismas que usa la API. Menos sería más rápido y peor.
const passwordHash = await bcrypt.hash(clave, 12);

const sedes = await prisma.site.findMany({ select: { id: true } });
const existente = await prisma.user.findUnique({ where: { email: correo }, select: { id: true } });

let usuario;
if (existente) {
  usuario = await prisma.user.update({
    where: { id: existente.id },
    data: { passwordHash, status: 'ACTIVE', role: 'SUPERADMIN', crossSitePatientRead: true },
    select: { id: true, email: true },
  });
  console.log(`Contraseña actualizada: ${usuario.email}`);
} else {
  usuario = await prisma.user.create({
    data: {
      email: correo,
      passwordHash,
      firstName: 'Administrador',
      lastName: 'Visión Colombia',
      role: 'SUPERADMIN',
      status: 'ACTIVE',
      crossSitePatientRead: true,
      siteAccess: { create: sedes.map((s, n) => ({ siteId: s.id, isPrimary: n === 0 })) },
    },
    select: { id: true, email: true },
  });
  console.log(`Administrador creado: ${usuario.email}`);
}

// El acceso a sedes se asegura también al actualizar: una cuenta sin sedes
// entra pero no ve ninguna agenda, y el fallo es difícil de relacionar.
for (const [n, s] of sedes.entries()) {
  await prisma.userSiteAccess.upsert({
    where: { userId_siteId: { userId: usuario.id, siteId: s.id } },
    update: {},
    create: { userId: usuario.id, siteId: s.id, isPrimary: n === 0 },
  });
}
console.log(`Acceso a ${sedes.length} sedes.`);

if (debil) {
  console.log(
    '\n⚠  Esa contraseña es adivinable. Detrás de este login hay datos de\n' +
      '   salud: cámbiela por una larga y única antes de que entre personal.',
  );
}

await prisma.$disconnect();
