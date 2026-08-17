"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const node_crypto_1 = require("node:crypto");
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const demo_1 = require("./demo");
const prompt_inicial_1 = require("./prompt-inicial");
const festivos_util_1 = require("../src/common/utils/festivos.util");
const hash_util_1 = require("../src/common/utils/hash.util");
if (!process.env.DATABASE_URL) {
    try {
        process.loadEnvFile((0, node_path_1.join)(__dirname, '..', '.env'));
    }
    catch {
    }
}
const prisma = new client_1.PrismaClient();
const PAGADORES = [
    { code: 'PARTICULAR', name: 'Particular', type: 'PARTICULAR', requiresAuthorization: false },
];
const SEDES = [
    {
        code: 'BOG-ALTOS',
        name: 'Bogotá — Altos del Bosque',
        city: 'Bogotá D.C.',
        address: 'Calle 134 # 7-83, Torre 1, Piso 6, Consultorio 161',
        municipalityCode: '11001',
        phone: '+576017455472',
    },
    {
        code: 'BOG-TEUSA',
        name: 'Bogotá — Teusaquillo',
        city: 'Bogotá D.C.',
        address: 'Calle 36 # 16-57, Barrio Teusaquillo',
        municipalityCode: '11001',
        phone: '+573223046156',
    },
    {
        code: 'IBG-INTER',
        name: 'Ibagué — Interlaken',
        city: 'Ibagué',
        address: 'Calle 17 # 8-21, Barrio Interlaken',
        municipalityCode: '73001',
        phone: '+576082761980',
    },
];
const HORARIO = {
    mon: [['07:00', '18:00']],
    tue: [['07:00', '18:00']],
    wed: [['07:00', '18:00']],
    thu: [['07:00', '18:00']],
    fri: [['07:00', '18:00']],
    sat: [['07:00', '13:00']],
};
async function main() {
    const sedes = [];
    for (const sede of SEDES) {
        sedes.push(await prisma.site.upsert({
            where: { code: sede.code },
            update: { ...sede, openingHours: HORARIO },
            create: { ...sede, openingHours: HORARIO },
        }));
    }
    console.log(`${sedes.length} sedes`);
    for (const p of PAGADORES) {
        await prisma.payer.upsert({ where: { code: p.code }, update: p, create: p });
    }
    console.log(`${PAGADORES.length} pagadores`);
    const servicios = JSON.parse((0, node_fs_1.readFileSync)((0, node_path_1.join)(__dirname, 'data', 'servicios.json'), 'utf8'));
    for (const { revisar: _revisar, ...s } of servicios) {
        await prisma.service.upsert({
            where: { slug: s.slug },
            update: { name: s.name, businessLine: s.businessLine },
            create: s,
        });
    }
    const porRevisar = servicios.filter((s) => s.revisar.length);
    console.log(`${servicios.length} servicios`);
    const anio = new Date().getUTCFullYear();
    const festivos = [anio, anio + 1, anio + 2].flatMap(festivos_util_1.festivosDe);
    for (const f of festivos) {
        await prisma.holiday.upsert({
            where: { date: new Date(f.date) },
            update: { name: f.name },
            create: { date: new Date(f.date), name: f.name },
        });
    }
    console.log(`${festivos.length} festivos (${anio}–${anio + 2})`);
    const email = process.env.SEED_ADMIN_EMAIL ?? 'admin@centrodigitaldediseno.com';
    const existente = await prisma.user.findUnique({ where: { email } });
    if (existente) {
        console.log(`admin ya existe: ${email}`);
    }
    else {
        const password = process.env.SEED_ADMIN_PASSWORD ?? (0, node_crypto_1.randomBytes)(12).toString('base64url');
        const admin = await prisma.user.create({
            data: {
                email,
                passwordHash: await hash_util_1.HashUtil.hash(password),
                firstName: 'Administrador',
                lastName: 'Visión Colombia',
                role: 'SUPERADMIN',
                status: 'ACTIVE',
                crossSitePatientRead: true,
                siteAccess: {
                    create: sedes.map((s, n) => ({ siteId: s.id, isPrimary: n === 0 })),
                },
            },
        });
        console.log(`\nadmin creado: ${admin.email}`);
        if (!process.env.SEED_ADMIN_PASSWORD) {
            console.log(`contraseña:   ${password}`);
            console.log('Cámbiela al primer ingreso. No se vuelve a mostrar.');
        }
    }
    const yaHayPrompt = await prisma.aiPrompt.findFirst({ where: { slug: 'atencion' } });
    if (yaHayPrompt) {
        console.log('prompt del asistente: ya existe, no se toca');
    }
    else {
        await prisma.aiPrompt.create({
            data: {
                slug: 'atencion',
                version: 1,
                content: prompt_inicial_1.PROMPT_ATENCION,
                notes: 'Versión inicial sembrada. Se ajusta desde el panel, no editando el archivo.',
                isActive: true,
            },
        });
        console.log('prompt del asistente: v1 activa');
    }
    if (process.env.SEED_DEMO === '1') {
        await (0, demo_1.sembrarDemo)(prisma);
    }
    if (porRevisar.length) {
        const campos = new Set(porRevisar.flatMap((s) => s.revisar));
        console.log(`\n⚠  ${porRevisar.length} de ${servicios.length} servicios traen datos conjeturados:` +
            `\n   ${[...campos].sort().join(', ')}` +
            '\n   Salen del sitio web, no de la clínica. Revíselos antes de agendar' +
            '\n   con pacientes reales: una duración inventada desordena la agenda' +
            '\n   de todo el día.\n');
    }
}
main()
    .catch((e) => {
    console.error(e);
    process.exitCode = 1;
})
    .finally(() => prisma.$disconnect());
//# sourceMappingURL=seed.js.map