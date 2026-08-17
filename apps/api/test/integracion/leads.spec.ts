import { PrismaClient, type User } from '@prisma/client';

import { AuditService } from '../../src/modules/audit/audit.service';
import { LeadsService } from '../../src/modules/leads/leads.service';
import { TimelineService } from '../../src/modules/timeline/timeline.service';
import type { PrismaService } from '../../src/prisma/prisma.service';

/**
 * La conversión de un lead no se marca a mano: se deriva de que la persona
 * tenga una cita. Lo que estas pruebas defienden es la parte sutil —que la
 * cita tiene que ser POSTERIOR al lead—, porque sin eso todo paciente antiguo
 * que escriba por WhatsApp cuenta como conversión y la tasa se infla sola.
 */
const hayBase = Boolean(process.env.DATABASE_URL);
(hayBase ? describe : describe.skip)('conversión de leads', () => {
  const prisma = new PrismaClient();
  const leads = new LeadsService(
    prisma as unknown as PrismaService,
    new AuditService(prisma as unknown as PrismaService),
    new TimelineService(prisma as unknown as PrismaService),
  );

  const ctx = { actor: { id: null } as unknown as User };
  const creados: string[] = [];
  let siteId: string;
  let serviceId: string;
  let professionalId: string;

  beforeAll(async () => {
    siteId = (await prisma.site.findFirstOrThrow({ select: { id: true } })).id;
    serviceId = (await prisma.service.findFirstOrThrow({ select: { id: true } })).id;
    professionalId = (await prisma.professional.findFirstOrThrow({ select: { id: true } })).id;
  });

  afterAll(async () => {
    for (const personId of creados) {
      await prisma.lead.deleteMany({ where: { personId } }).catch(() => undefined);
      await prisma.resourceBooking.deleteMany({ where: { appointment: { personId } } }).catch(() => undefined);
      await prisma.appointment.deleteMany({ where: { personId } }).catch(() => undefined);
      await prisma.patientEvent.deleteMany({ where: { personId } }).catch(() => undefined);
      await prisma.person.delete({ where: { id: personId } }).catch(() => undefined);
    }
    await prisma.$disconnect();
  });

  async function persona(nombre: string) {
    const p = await prisma.person.create({
      data: {
        firstName: nombre.split(' ')[0],
        firstSurname: nombre.split(' ').slice(1).join(' ') || 'Prueba',
        displayName: nombre,
        docNumber: `T${Date.now()}${creados.length}`,
        isPatient: true,
      },
      select: { id: true },
    });
    creados.push(p.id);
    return p.id;
  }

  /** Una cita cuyo `createdAt` se fija a mano para poder probar el orden. */
  async function cita(personId: string, creadaEn: Date) {
    const inicio = new Date(creadaEn.getTime() + 7 * 86_400_000);
    const c = await prisma.appointment.create({
      data: {
        publicCode: `TST${Date.now()}${Math.floor(inicio.getTime() % 1000)}`,
        siteId,
        personId,
        serviceId,
        startsAt: inicio,
        endsAt: new Date(inicio.getTime() + 1_800_000),
        createdAt: creadaEn,
      },
      select: { id: true },
    });
    return c.id;
  }

  it('una cita posterior al lead lo convierte', async () => {
    const p = await persona('Lead Convertido');
    const hace10 = new Date(Date.now() - 10 * 86_400_000);
    await prisma.lead.create({ data: { personId: p, siteId, createdAt: hace10 } });
    await cita(p, new Date(Date.now() - 5 * 86_400_000));

    await leads.embudo();

    const l = await prisma.lead.findFirstOrThrow({ where: { personId: p } });
    expect(l.status).toBe('CONVERTIDO');
    expect(l.convertedAt).not.toBeNull();
  });

  it('una cita ANTERIOR al lead no lo convierte', async () => {
    // El paciente ya venía a la clínica y escribió después por otra cosa. Esa
    // cita vieja no la trajo esta conversación.
    const p = await persona('Paciente Antiguo');
    await cita(p, new Date(Date.now() - 30 * 86_400_000));
    await prisma.lead.create({ data: { personId: p, siteId, createdAt: new Date() } });

    await leads.embudo();

    const l = await prisma.lead.findFirstOrThrow({ where: { personId: p } });
    expect(l.status).not.toBe('CONVERTIDO');
    expect(l.convertedAt).toBeNull();
  });

  it('un lead sin cita sigue abierto', async () => {
    const p = await persona('Lead Sin Cita');
    await prisma.lead.create({ data: { personId: p, siteId } });

    await leads.embudo();

    const l = await prisma.lead.findFirstOrThrow({ where: { personId: p } });
    expect(l.convertedAt).toBeNull();
  });

  it('un lead perdido no revive porque el paciente vuelva luego', async () => {
    const p = await persona('Lead Perdido');
    const l = await prisma.lead.create({ data: { personId: p, siteId }, select: { id: true } });
    await leads.perder(l.id, 'Precio', ctx);
    await cita(p, new Date());

    await leads.embudo();

    const despues = await prisma.lead.findUniqueOrThrow({ where: { id: l.id } });
    expect(despues.status).toBe('PERDIDO');
  });

  it('no se puede perder un lead ya convertido', async () => {
    const p = await persona('Lead Ya Convertido');
    const l = await prisma.lead.create({
      data: { personId: p, siteId, createdAt: new Date(Date.now() - 86_400_000) },
      select: { id: true },
    });
    await cita(p, new Date());
    await leads.embudo();

    await expect(leads.perder(l.id, 'Precio', ctx)).rejects.toThrow();
  });

  it('el motivo de pérdida se agrupa: es lo que dice qué arreglar', async () => {
    const antes = (await leads.embudo()).motivosDePerdida.find((m) => m.motivo === 'precio')?.veces ?? 0;

    for (const nombre of ['Perdido A', 'Perdido B']) {
      const p = await persona(nombre);
      const l = await prisma.lead.create({ data: { personId: p, siteId }, select: { id: true } });
      await leads.perder(l.id, 'Precio', ctx);
    }

    const { motivosDePerdida } = await leads.embudo();
    expect(motivosDePerdida.find((m) => m.motivo === 'precio')?.veces).toBe(antes + 2);
  });
});
