/**
 * Un solo origen en desarrollo, igual que Caddy en producción.
 *
 *   node scripts/dev-proxy.mjs
 *
 *   http://localhost:8777/         sitio público de la clínica (HTML estático)
 *   http://localhost:8777/admin    VISION OS  -> Next en :3000
 *   http://localhost:8777/api      API        -> NestJS en :3001
 *
 * Existe porque el mismo origen no es un detalle de comodidad: la sesión va
 * en cookie httpOnly, y una cookie no cruza de :3000 a :3001. Levantar Caddy
 * en local sería lo equivalente, pero son 60 líneas de Node sin instalar
 * nada — y el reparto queda escrito dos veces en el mismo repositorio, que
 * es su único defecto conocido.
 */
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer, request as httpRequest } from 'node:http';
import { extname, join, normalize } from 'node:path';

const PUERTO = Number(process.env.PROXY_PORT ?? 8777);
const SITIO = process.env.SITIO_DIR ?? 'C:\\Users\\centr\\Desktop\\claude code\\visioncolombia';
const DESTINOS = [
  { prefijo: '/api', puerto: Number(process.env.API_PORT ?? 3001) },
  { prefijo: '/admin', puerto: Number(process.env.WEB_PORT ?? 3000) },
  // Next sirve sus recursos bajo el basePath, pero el HMR de desarrollo y
  // algunas rutas internas salen de la raíz igualmente.
  { prefijo: '/_next', puerto: Number(process.env.WEB_PORT ?? 3000) },
];

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

function proxiar(req, res, puerto) {
  const arriba = httpRequest(
    { host: '127.0.0.1', port: puerto, path: req.url, method: req.method, headers: req.headers },
    (r) => {
      res.writeHead(r.statusCode ?? 502, r.headers);
      r.pipe(res);
    },
  );
  arriba.on('error', (e) => {
    res.writeHead(502, { 'content-type': 'text/plain; charset=utf-8' });
    res.end(`No responde el servicio en :${puerto}\n${e.message}\n`);
  });
  req.pipe(arriba);
}

function servirEstatico(req, res) {
  // normalize + el guard de prefijo cortan el ../../ que se saldría del sitio.
  const limpio = decodeURIComponent((req.url ?? '/').split('?')[0]);
  let ruta = normalize(join(SITIO, limpio === '/' ? 'index.html' : limpio));

  if (!ruta.startsWith(normalize(SITIO))) {
    res.writeHead(403).end('Fuera del sitio');
    return;
  }
  if (existsSync(ruta) && statSync(ruta).isDirectory()) ruta = join(ruta, 'index.html');
  if (!existsSync(ruta)) {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }).end('No encontrado');
    return;
  }

  res.writeHead(200, { 'content-type': MIME[extname(ruta).toLowerCase()] ?? 'application/octet-stream' });
  createReadStream(ruta).pipe(res);
}

createServer((req, res) => {
  const ruta = (req.url ?? '/').split('?')[0];
  const destino = DESTINOS.find((d) => ruta === d.prefijo || ruta.startsWith(`${d.prefijo}/`));
  if (destino) return proxiar(req, res, destino.puerto);
  return servirEstatico(req, res);
})
  // Upgrade para el hot reload de Next, que va por WebSocket.
  .on('upgrade', (req, socket, head) => {
    const arriba = httpRequest({
      host: '127.0.0.1',
      port: Number(process.env.WEB_PORT ?? 3000),
      path: req.url,
      headers: req.headers,
      method: req.method,
    });
    arriba.on('upgrade', (r, s, h) => {
      socket.write(
        `HTTP/1.1 101 Switching Protocols\r\n${Object.entries(r.headers)
          .map(([k, v]) => `${k}: ${v}`)
          .join('\r\n')}\r\n\r\n`,
      );
      s.write(h);
      s.pipe(socket).pipe(s);
    });
    arriba.on('error', () => socket.destroy());
    arriba.end(head);
  })
  .listen(PUERTO, () => {
    console.log(`sitio público   http://localhost:${PUERTO}/`);
    console.log(`VISION OS       http://localhost:${PUERTO}/admin`);
    console.log(`API             http://localhost:${PUERTO}/api/health`);
    if (!existsSync(SITIO)) console.log(`\n⚠  No existe ${SITIO}: el sitio público dará 404.`);
  });
