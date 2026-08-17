#!/usr/bin/env node
/**
 * Genera una migración de Prisma sin romper nada.
 *
 *   node scripts/migracion.mjs nombre_de_la_migracion
 *
 * Existe por dos razones, y las dos ya costaron caro:
 *
 * 1. `migrate diff --from-migrations` exige `--shadow-database-url`, y la base
 *    que se le pase SE BORRA. El 16 de agosto de 2026 se apuntó a la base real
 *    y se perdieron los datos de desarrollo. Aquí se usa
 *    `--from-schema-datasource`, que LEE la base y no la toca.
 *
 * 2. El diff no conoce lo que crearon las migraciones en SQL crudo —el índice
 *    de trigramas para buscar pacientes, el EXCLUDE de la agenda, los triggers
 *    append-only— y propone borrarlo en cada migración nueva. Borrar
 *    `persons_name_trgm` deja la búsqueda de pacientes recorriendo la tabla
 *    entera y nadie lo nota hasta que hay veinte mil.
 *
 * Los borrados conocidos se filtran. Cualquier otro DROP detiene el script:
 * puede ser legítimo, pero tiene que mirarlo un humano.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const API = join(import.meta.dirname, '..', 'apps', 'api');

/** Objetos que viven en migraciones de SQL crudo y el datamodel desconoce. */
const INVISIBLES_PARA_PRISMA = [
  'persons_name_trgm',
  'persons_doc_idx',
  'rb_no_overlap',
  'rb_one_resource',
];

const nombre = process.argv[2];
if (!nombre || !/^[a-z0-9_]+$/.test(nombre)) {
  console.error('Uso: node scripts/migracion.mjs nombre_en_minusculas_con_guion_bajo');
  process.exit(1);
}

const sello = new Date().toISOString().replace(/\D/g, '').slice(0, 14);
const carpeta = join(API, 'prisma', 'migrations', `${sello}_${nombre}`);

const bruto = execFileSync(
  'npx',
  [
    'prisma',
    'migrate',
    'diff',
    '--from-schema-datasource',
    'prisma/schema.prisma',
    '--to-schema-datamodel',
    'prisma/schema.prisma',
    '--script',
  ],
  { cwd: API, encoding: 'utf8', shell: process.platform === 'win32' },
);

if (bruto.trim().length < 10) {
  console.log('No hay cambios que migrar.');
  process.exit(0);
}

// El SQL viene en bloques separados por línea en blanco, cada uno con su
// comentario `-- Algo`. Se filtra por bloque para no partir una sentencia.
const bloques = bruto.split(/\n\n+/);
const quitados = [];
const sospechosos = [];

const conservados = bloques.filter((b) => {
  if (!/\bDROP\b/.test(b)) return true;

  if (INVISIBLES_PARA_PRISMA.some((o) => b.includes(o))) {
    quitados.push(b.trim().split('\n').pop());
    return false;
  }

  // Prisma borra y recrea claves foráneas idénticas sin motivo. Si el mismo
  // bloque se vuelve a añadir más abajo, es ruido.
  const fk = b.match(/DROP CONSTRAINT "([^"]+)"/)?.[1];
  if (fk && bruto.includes(`ADD CONSTRAINT "${fk}"`)) {
    quitados.push(`churn de clave foránea: ${fk}`);
    return false;
  }

  sospechosos.push(b.trim());
  return true;
});

if (sospechosos.length) {
  console.error('\n⛔ El diff propone borrados que NO reconozco:\n');
  for (const s of sospechosos) console.error('   ' + s.replace(/\n/g, '\n   '));
  console.error('\nSi son correctos, escriba la migración a mano. Si no, revise el esquema.');
  process.exit(1);
}

// La re-adición de una FK cuyo DROP se quitó también sobra.
const sql = conservados
  .filter((b) => {
    const fk = b.match(/ADD CONSTRAINT "([^"]+)"/)?.[1];
    return !(fk && quitados.some((q) => q.includes(fk)));
  })
  .join('\n\n');

mkdirSync(carpeta, { recursive: true });
writeFileSync(
  join(carpeta, 'migration.sql'),
  `-- ${nombre}\n--\n-- Generada con scripts/migracion.mjs: lee la base, no la toca.\n` +
    (quitados.length
      ? `-- Se filtraron ${quitados.length} borrados que el datamodel no conoce:\n` +
        quitados.map((q) => `--   ${q}`).join('\n') +
        '\n'
      : '') +
    '\n' +
    sql.trimStart(),
  'utf8',
);

console.log(`Migración escrita en ${carpeta}`);
if (quitados.length) console.log(`Filtrados ${quitados.length} borrados que habrían roto la base.`);
console.log('\nRevise el SQL y aplique con:  npx prisma migrate deploy  (desde apps/api)');
