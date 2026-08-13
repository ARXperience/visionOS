/** @type {import('next').NextConfig} */
export default {
  // VISION OS vive bajo /admin del mismo dominio que el sitio público de la
  // clínica. No es cosmética: al compartir origen, la sesión puede ir en una
  // cookie httpOnly en lugar de localStorage —que cualquier XSS lee— y
  // desaparece el CORS entre la web y la API.
  basePath: '/admin',

  // Imagen de producción delgada: sin standalone habría que copiar
  // node_modules entero al runtime.
  output: 'standalone',
  outputFileTracingRoot: new URL('../../', import.meta.url).pathname,
};
