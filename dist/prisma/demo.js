"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sembrarDemo = sembrarDemo;
const PROFESIONALES = [
    { doc: 'DEMO-1', nombre: 'Laura', apellido: 'Restrepo', tipo: 'OFTALMOLOGO', esp: ['RETINA'], color: '#0E93B4' },
    { doc: 'DEMO-2', nombre: 'Andrés', apellido: 'Gómez', tipo: 'OFTALMOLOGO', esp: ['GLAUCOMA', 'CORNEA'], color: '#1554A8' },
    { doc: 'DEMO-3', nombre: 'Carolina', apellido: 'Ríos', tipo: 'OPTOMETRA', esp: [], color: '#7A5B10' },
];
const CONSULTORIOS = [
    { code: 'DEMO-C1', name: 'Consultorio 1', kind: 'CONSULTORIO' },
    { code: 'DEMO-C2', name: 'Consultorio 2', kind: 'CONSULTORIO' },
    { code: 'DEMO-D1', name: 'Sala de diagnóstico', kind: 'SALA_DIAGNOSTICO' },
    { code: 'DEMO-Q1', name: 'Quirófano 1', kind: 'QUIROFANO' },
];
async function sembrarDemo(prisma) {
    const sedes = await prisma.site.findMany({ select: { id: true, code: true } });
    if (!sedes.length)
        throw new Error('Siembre las sedes primero');
    for (const sede of sedes) {
        for (const c of CONSULTORIOS) {
            await prisma.room.upsert({
                where: { siteId_code: { siteId: sede.id, code: c.code } },
                update: {},
                create: { siteId: sede.id, ...c },
            });
        }
        await prisma.equipment.upsert({
            where: { siteId_code: { siteId: sede.id, code: 'DEMO-OCT' } },
            update: {},
            create: { siteId: sede.id, code: 'DEMO-OCT', name: 'OCT de ejemplo', modality: 'OCT' },
        });
    }
    const consultas = await prisma.service.findMany({
        where: { businessLine: { in: ['CONSULTA', 'EXAMEN'] } },
        select: { id: true, businessLine: true },
    });
    for (const p of PROFESIONALES) {
        const prof = await prisma.professional.upsert({
            where: { docType_docNumber: { docType: 'CC', docNumber: p.doc } },
            update: {},
            create: {
                docNumber: p.doc,
                firstName: p.nombre,
                lastName: p.apellido,
                displayName: `${p.tipo === 'OPTOMETRA' ? 'Opt.' : 'Dr(a).'} ${p.nombre} ${p.apellido}`,
                type: p.tipo,
                specialties: p.esp,
                color: p.color,
            },
            select: { id: true },
        });
        for (const sede of sedes) {
            await prisma.professionalSite.upsert({
                where: { professionalId_siteId: { professionalId: prof.id, siteId: sede.id } },
                update: {},
                create: { professionalId: prof.id, siteId: sede.id },
            });
            const yaTiene = await prisma.professionalAvailability.count({
                where: { professionalId: prof.id, siteId: sede.id },
            });
            if (yaTiene)
                continue;
            for (let dia = 1; dia <= 5; dia++) {
                for (const [ini, fin] of [
                    [480, 720],
                    [840, 1080],
                ]) {
                    await prisma.professionalAvailability.create({
                        data: { professionalId: prof.id, siteId: sede.id, weekday: dia, startMinute: ini, endMinute: fin },
                    });
                }
            }
        }
        for (const s of consultas) {
            await prisma.serviceProfessional.upsert({
                where: { serviceId_professionalId: { serviceId: s.id, professionalId: prof.id } },
                update: {},
                create: { serviceId: s.id, professionalId: prof.id },
            });
        }
    }
    console.log(`demo: ${PROFESIONALES.length} profesionales, ${CONSULTORIOS.length} salas por sede, ` +
        `horarios L–V 8:00–12:00 y 14:00–18:00`);
    console.log('       todo con prefijo DEMO-. Borrar antes de producción.');
}
//# sourceMappingURL=demo.js.map