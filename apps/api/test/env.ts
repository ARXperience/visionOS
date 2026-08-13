import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Carga .env para las pruebas.
 *
 * No sirve `process.loadEnvFile`: escribe en el `process.env` real y jest
 * corre cada suite contra una copia suya, así que la variable se pierde por
 * el camino. Se parsea a mano — son cinco líneas y evita una dependencia.
 *
 * Lo que ya venga del entorno manda: en CI las variables no salen de un
 * archivo.
 */
const archivo = join(__dirname, '..', '.env');

if (existsSync(archivo)) {
  // Se parte por \r?\n y no por \n: en Windows el archivo queda con CRLF, y
  // en una expresion regular de JS `.` no consume \r, asi que `(.*)$` fallaba
  // en toda linea con valor — solo casaban las vacias. Costo: una hora.
  for (const linea of readFileSync(archivo, 'utf8').split(/\r?\n/)) {
    const m = /^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/i.exec(linea);
    if (!m) continue;
    const [, clave, bruto] = m;
    if (process.env[clave] !== undefined) continue;
    process.env[clave] = bruto.trim().replace(/^["'](.*)["']$/, '$1');
  }
}
