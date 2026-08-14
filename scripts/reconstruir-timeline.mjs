/**
 * Reconstruye `patient_events` desde cero.
 *
 *   node scripts/reconstruir-timeline.mjs [--aplicar]
 *
 * Sin `--aplicar` solo cuenta lo que haría. Este script es lo que convierte
 * la duplicación de la línea de tiempo en un inconveniente y no en un
 * incidente: si alguien escribió por fuera del servicio, o si un módulo
 * nuevo empieza a proyectar tarde, la tabla se regenera y vuelve a coincidir
 * con la verdad, que sigue estando en las tablas normalizadas.
 *
 * Se escribió en el mismo momento que la tabla, a propósito. Un script de
 * reconstrucción "para después" es un script que no existe el día que hace
 * falta.
 */
import { PrismaClient } from '@prisma/client';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const env = join(import.meta.dirname, '..', 'apps', 'api', '.env');
if (existsSync(env)) {
  for (const l of readFileSync(env, 'utf8').split(/\r?\n/)) {
    const m = /^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/i.exec(l);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].trim();
  }
}

const aplicar = process.argv.includes('--aplicar');
const prisma = new PrismaClient();

const fecha = (d) =>
  d.toLocaleString('es-CO', {
    timeZone: 'America/Bogota',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

const eventos = [];

// ── primer contacto: la conversación más antigua de cada persona ────
const conversaciones = await prisma.conversation.findMany({
  where: { personId: { not: null } },
  orderBy: { createdAt: 'asc' },
  select: { id: true, personId: true, phoneNumber: true, siteId: true, createdAt: true },
});
const yaVisto = new Set();
for (const c of conversaciones) {
  if (yaVisto.has(c.personId)) continue;
  yaVisto.add(c.personId);
  eventos.push({
    personId: c.personId,
    type: 'PRIMER_CONTACTO',
    title: `Escribió por WhatsApp desde ${c.phoneNumber ?? 'un número desconocido'}`,
    siteId: c.siteId,
    refType: 'conversation',
    refId: c.id,
    occurredAt: c.createdAt,
  });
}

// ── citas: creación y los hitos de su historial de estados ──────────
const citas = await prisma.appointment.findMany({
  select: {
    id: true,
    publicCode: true,
    personId: true,
    siteId: true,
    startsAt: true,
    createdAt: true,
    createdById: true,
    service: { select: { name: true } },
    statusEvents: { orderBy: { occurredAt: 'asc' }, select: { toStatus: true, occurredAt: true, reason: true, byUserId: true } },
  },
});

const HITOS = {
  CONFIRMADA: ['CITA_CONFIRMADA', (c) => `Confirmó la cita ${c}`],
  LLEGO: ['CHECKIN', (c) => `Llegó a la cita ${c}`],
  FINALIZADA: ['ATENDIDO', (c) => `Fue atendido — cita ${c}`],
  NO_ASISTIO: ['NO_ASISTIO', (c) => `No asistió a la cita ${c}`],
  CANCELADA: ['CITA_CANCELADA', (c, m) => `Canceló la cita ${c}${m ? `: ${m}` : ''}`],
};

for (const cita of citas) {
  eventos.push({
    personId: cita.personId,
    type: 'CITA_CREADA',
    title: `Agendó ${cita.service.name} — ${fecha(cita.startsAt)}`,
    siteId: cita.siteId,
    actorUserId: cita.createdById,
    refType: 'appointment',
    refId: cita.id,
    occurredAt: cita.createdAt,
    payload: { publicCode: cita.publicCode },
  });

  for (const s of cita.statusEvents) {
    const hito = HITOS[s.toStatus];
    if (!hito) continue;
    eventos.push({
      personId: cita.personId,
      type: hito[0],
      title: hito[1](cita.publicCode, s.reason),
      siteId: cita.siteId,
      actorUserId: s.byUserId,
      refType: 'appointment',
      refId: cita.id,
      occurredAt: s.occurredAt,
    });
  }
}

console.log(`Reconstrucción: ${eventos.length} eventos desde ${citas.length} citas ` +
  `y ${yaVisto.size} primeros contactos.`);

if (!aplicar) {
  const actuales = await prisma.patientEvent.count();
  console.log(`Actualmente hay ${actuales}. Ejecute con --aplicar para reemplazarlos.`);
} else {
  // El trigger bloquea el UPDATE, no el DELETE: la tabla se reemplaza entera.
  const borrados = await prisma.patientEvent.deleteMany({});
  await prisma.patientEvent.createMany({ data: eventos });
  console.log(`Reemplazados ${borrados.count} por ${eventos.length}.`);
}

await prisma.$disconnect();
