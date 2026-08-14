/**
 * Siembra lo que la clínica necesita para arrancar: las 3 sedes reales, el
 * catálogo de servicios, los pagadores base, los festivos y un administrador.
 *
 *   npm run seed --workspace apps/api
 *
 * Es idempotente: se puede correr las veces que haga falta.
 *
 * ⚠ El catálogo sale de `data/servicios.json`, que genera
 * `scripts/extraer-catalogo.py` a partir del sitio público. La duración de
 * cada servicio, el equipo que usa y quién lo presta NO están en el sitio:
 * son conjeturas marcadas en el campo `revisar`. El seed las siembra y avisa
 * cuántas quedan sin revisar. Agendar con una duración inventada es peor que
 * no agendar, así que esa lista tiene que llegar a cero antes de producción.
 */
import { PrismaClient, type BusinessLine, type EquipmentModality, type RoomKind } from '@prisma/client';
import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { sembrarDemo } from './demo';
import { festivosDe } from '../src/common/utils/festivos.util';
import { HashUtil } from '../src/common/utils/hash.util';

// El CLI de Prisma carga .env solo; ts-node no. `loadEnvFile` es de Node
// (>=20.12), asi que no hace falta dotenv.
if (!process.env.DATABASE_URL) {
  try {
    process.loadEnvFile(join(__dirname, '..', '.env'));
  } catch {
    // En el contenedor las variables vienen del entorno, no de un archivo.
  }
}

const prisma = new PrismaClient();

interface ServicioSembrado {
  code: string;
  name: string;
  slug: string;
  businessLine: BusinessLine;
  durationMin: number;
  bufferMin: number;
  requiresProfessional: boolean;
  requiresRoom: boolean;
  requiredRoomKind: RoomKind | null;
  requiredModality: EquipmentModality | null;
  requiresDilation: boolean;
  requiresReferral: boolean;
  requiresAuthorization: boolean;
  producesResultFile: boolean;
  preparationNotes: string | null;
  revisar: string[];
}

/**
 * Pagadores mínimos. "Particular" no es la ausencia de pagador: es un pagador
 * con su propia tarifa, y modelarlo como null obliga a un caso especial en
 * cada consulta de precio.
 */
const PAGADORES = [
  { code: 'PARTICULAR', name: 'Particular', type: 'PARTICULAR' as const, requiresAuthorization: false },
];

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

  for (const p of PAGADORES) {
    await prisma.payer.upsert({ where: { code: p.code }, update: p, create: p });
  }
  console.log(`${PAGADORES.length} pagadores`);

  // ── Catálogo ──────────────────────────────────────────────────────
  const servicios: ServicioSembrado[] = JSON.parse(
    readFileSync(join(__dirname, 'data', 'servicios.json'), 'utf8'),
  );

  for (const { revisar: _revisar, ...s } of servicios) {
    await prisma.service.upsert({
      where: { slug: s.slug },
      // Al re-sembrar NO se pisan duración ni recursos: si la clínica ya los
      // corrigió a mano, volver a poner la conjetura sería destruir su trabajo.
      update: { name: s.name, businessLine: s.businessLine },
      create: s,
    });
  }

  const porRevisar = servicios.filter((s) => s.revisar.length);
  console.log(`${servicios.length} servicios`);

  // ── Festivos ──────────────────────────────────────────────────────
  const anio = new Date().getUTCFullYear();
  const festivos = [anio, anio + 1, anio + 2].flatMap(festivosDe);
  for (const f of festivos) {
    await prisma.holiday.upsert({
      where: { date: new Date(f.date) },
      update: { name: f.name },
      create: { date: new Date(f.date), name: f.name },
    });
  }
  console.log(`${festivos.length} festivos (${anio}–${anio + 2})`);

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
      console.log('Cámbiela al primer ingreso. No se vuelve a mostrar.');
    }
  }

  if (process.env.SEED_DEMO === '1') {
    await sembrarDemo(prisma);
  }

  if (porRevisar.length) {
    const campos = new Set(porRevisar.flatMap((s) => s.revisar));
    console.log(
      `\n⚠  ${porRevisar.length} de ${servicios.length} servicios traen datos conjeturados:` +
        `\n   ${[...campos].sort().join(', ')}` +
        '\n   Salen del sitio web, no de la clínica. Revíselos antes de agendar' +
        '\n   con pacientes reales: una duración inventada desordena la agenda' +
        '\n   de todo el día.\n',
    );
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
