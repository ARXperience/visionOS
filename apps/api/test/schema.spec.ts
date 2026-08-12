import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const schema = readFileSync(join(__dirname, '..', 'prisma', 'schema.prisma'), 'utf8');

/**
 * El EXCLUDE de la agenda (E3) usa tstzrange, que no compila sobre columnas
 * `timestamp` sin zona — y Prisma mapea DateTime a eso por defecto. Como
 * Colombia no tiene horario de verano, el error no se ve hasta que alguien
 * consulta con otro TZ, y entonces son citas movidas cinco horas en
 * produccion. Barato comprobarlo ahora, odioso arreglarlo despues.
 */
describe('schema.prisma', () => {
  const lineas = schema.split('\n');

  it('declara Timestamptz en todo campo DateTime que no sea una fecha suelta', () => {
    const infractores = lineas
      .map((linea, n) => ({ linea: linea.trim(), n: n + 1 }))
      .filter(({ linea }) => /^\w+\s+DateTime\b/.test(linea))
      .filter(({ linea }) => !linea.includes('@db.Timestamptz') && !linea.includes('@db.Date'))
      .map(({ linea, n }) => `  linea ${n}: ${linea}`);

    expect(infractores).toEqual([]);
  });

  it('mantiene audit_logs sin campos de edicion: es append-only', () => {
    const modelo = schema.slice(schema.indexOf('model AuditLog'));
    const cuerpo = modelo.slice(0, modelo.indexOf('@@map("audit_logs")'));

    expect(cuerpo).not.toMatch(/\bupdatedAt\b/);
    expect(cuerpo).not.toMatch(/\bdeletedAt\b/);
  });

  it('registra las lecturas, no solo las escrituras (Ley 1581)', () => {
    expect(schema).toMatch(/enum AuditAction[\s\S]*?\bREAD\b[\s\S]*?\}/);
    expect(schema).toMatch(/enum AuditAction[\s\S]*?\bEXPORT\b[\s\S]*?\}/);
  });
});
