/**
 * Levanta el sistema completo en local con un solo comando.
 *
 *   npm run local
 *
 * Cuatro procesos:
 *   api      :3001   NestJS
 *   web      :3000   Next
 *   gateway  :3002   Baileys (solo en localhost)
 *   proxy    :8777   los reparte como lo hará el servidor
 *
 * El proxy existe porque el mismo origen no es comodidad: la sesión va en
 * una cookie httpOnly, y una cookie no cruza de :3000 a :3001. Sin él, el
 * login parece funcionar y no persiste.
 *
 * Ctrl+C cierra los cuatro. Sin dependencias: `concurrently` haría lo mismo
 * y son treinta líneas.
 */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const raiz = join(import.meta.dirname, '..');

if (!existsSync(join(raiz, 'apps', 'api', '.env'))) {
  console.error('Falta apps/api/.env. Copie .env.example y ponga DATABASE_URL.');
  process.exit(1);
}

const procesos = [];

function arrancar(nombre, comando, args, color) {
  const p = spawn(comando, args, {
    cwd: raiz,
    shell: true,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: process.env,
  });

  const etiqueta = `\x1b[${color}m${nombre.padEnd(8)}\x1b[0m`;
  const escribir = (buf) => {
    for (const linea of String(buf).split('\n')) {
      if (linea.trim()) console.log(`${etiqueta} ${linea}`);
    }
  };

  p.stdout.on('data', escribir);
  p.stderr.on('data', escribir);
  p.on('exit', (codigo) => {
    console.log(`${etiqueta} terminó con código ${codigo}`);
  });

  procesos.push(p);
  return p;
}

console.log('Levantando VISION OS en local…\n');

// turbo arranca api, web y gateway a la vez: los tres tienen script `dev`.
arrancar('turbo', 'npm', ['run', 'dev'], '36');

// El proxy espera un poco: si arranca antes que Next, la primera petición
// da 502 y parece que algo está roto.
setTimeout(() => arrancar('proxy', 'node', ['scripts/dev-proxy.mjs'], '35'), 6000);

setTimeout(() => {
  console.log('\n  sitio público   http://localhost:8777/');
  console.log('  VISION OS       http://localhost:8777/admin');
  console.log('  salud de la API http://localhost:8777/api/health\n');
}, 12_000);

for (const senal of ['SIGINT', 'SIGTERM']) {
  process.on(senal, () => {
    console.log('\nCerrando…');
    for (const p of procesos) p.kill();
    process.exit(0);
  });
}
