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
  // Los 5 s por defecto asumen una base local. La nuestra esta en
  // us-east-2 y cada consulta va y vuelve por internet: una prueba con
  // cinco escrituras seguidas ronda los 3,5 s sola y cruza el limite en
  // cuanto el resto de la suite compite por la conexion. Fallaba de forma
  // intermitente y parecia un fallo del codigo.
  testTimeout: 30_000,
  // Sin --passWithNoTests, a proposito. Si no hay pruebas, falla.
};
