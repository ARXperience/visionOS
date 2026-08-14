/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  moduleFileExtensions: ['js', 'json', 'ts'],
  setupFiles: ['<rootDir>/test/env.ts'],
  // Una sola suite a la vez. Jest paraleliza por defecto y cada worker abre
  // su propio pool de Prisma; contra una base compartida —y con el limite de
  // conexiones del plan gratuito de Neon— eso produce fallos que parecen del
  // codigo y son del entorno. Las pruebas de integracion ademas comparten
  // filas: serializarlas es correcto, no solo conveniente.
  maxWorkers: 1,
  // Sin --passWithNoTests, a proposito. Si no hay pruebas, falla.
};
