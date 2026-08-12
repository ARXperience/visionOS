/** @type {import('next').NextConfig} */
export default {
  // Imagen de produccion delgada: sin standalone habria que copiar
  // node_modules entero al runtime.
  output: 'standalone',
  outputFileTracingRoot: new URL('../../', import.meta.url).pathname,
};
