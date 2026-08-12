/**
 * Siembra lo mínimo para entrar al sistema: las 3 sedes reales y un
 * administrador. El catálogo de los 41 servicios entra en E1, con parser
 * de content.json y revisión humana — la duración de cada servicio y quién
 * lo presta no están en el sitio web y no se pueden inventar.
 *
 *   npm run seed --workspace apps/api
 *
 * Es idempotente: se puede correr las veces que haga falta.
 */
import { PrismaClient } from '@prisma/client';
import { randomBytes } from 'node:crypto';

import { HashUtil } from '../src/common/utils/hash.util';

const prisma = new PrismaClient();

// Datos publicados en visioncolombia/tools/sedes.html.
const SEDES = [
  {
    code: 'BOG-ALTOS',
    name: 'Bogotá — Altos del Bosque',
    city: 'Bogotá D.C.',
    address: 'Calle 134 # 7-83, Torre 1, Piso 6, Consultorio 161',
    municipalityCode: '11001',
    phone: '+576017455472',
  },
  {
    code: 'BOG-TEUSA',
    name: 'Bogotá — Teusaquillo',
    city: 'Bogotá D.C.',
    address: 'Calle 36 # 16-57, Barrio Teusaquillo',
    municipalityCode: '11001',
    phone: '+573223046156',
  },
  {
    code: 'IBG-INTER',
    name: 'Ibagué — Interlaken',
    city: 'Ibagué',
    address: 'Calle 17 # 8-21, Barrio Interlaken',
    municipalityCode: '73001',
    phone: '+576082761980',
  },
];

// Lunes a viernes 7:00–18:00, sábado 7:00–13:00. Horario de puertas.
const HORARIO = {
  mon: [['07:00', '18:00']],
  tue: [['07:00', '18:00']],
  wed: [['07:00', '18:00']],
  thu: [['07:00', '18:00']],
  fri: [['07:00', '18:00']],
  sat: [['07:00', '13:00']],
};

async function main(): Promise<void> {
  const sedes = [];
  for (const sede of SEDES) {
    sedes.push(
      await prisma.site.upsert({
        where: { code: sede.code },
        update: { ...sede, openingHours: HORARIO },
        create: { ...sede, openingHours: HORARIO },
      }),
    );
  }
  console.log(`${sedes.length} sedes`);

  const email = process.env.SEED_ADMIN_EMAIL ?? 'admin@visioncolombia.com.co';
  const existente = await prisma.user.findUnique({ where: { email } });

  if (existente) {
    console.log(`admin ya existe: ${email}`);
  } else {
    // Contraseña aleatoria impresa una sola vez. Nunca una por defecto en el
    // código: un "admin/admin123" olvidado en producción es una historia
    // clínica filtrada.
    const password = process.env.SEED_ADMIN_PASSWORD ?? randomBytes(12).toString('base64url');

    const admin = await prisma.user.create({
      data: {
        email,
        passwordHash: await HashUtil.hash(password),
        firstName: 'Administrador',
        lastName: 'Visión Colombia',
        role: 'SUPERADMIN',
        status: 'ACTIVE',
        crossSitePatientRead: true,
        siteAccess: {
          create: sedes.map((s, n) => ({ siteId: s.id, isPrimary: n === 0 })),
        },
      },
    });

    console.log(`\nadmin creado: ${admin.email}`);
    if (!process.env.SEED_ADMIN_PASSWORD) {
      console.log(`contraseña:   ${password}`);
      console.log('Cámbiela al primer ingreso. No se vuelve a mostrar.\n');
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
