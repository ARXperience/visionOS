# VISION OS

Sistema de gestión de la clínica oftalmológica **Visión Colombia** — 3 sedes
(Bogotá Altos del Bosque, Bogotá Teusaquillo, Ibagué Interlaken), 41 servicios
en 6 líneas de negocio.

El núcleo es el **Paciente 360°**: una sola persona a la que se enganchan
conversación, cita, orden, resultado y cobro. No son 26 aplicaciones.

Estado: **E0 — esqueleto desplegado**. El primer módulo con pacientes reales es
el inbox de WhatsApp (E2).

---

## Levantar en local

Hace falta Node ≥ 20 y un Postgres 16 alcanzable — sirve el mismo proyecto de
Supabase, o uno local.

```bash
npm install
cp .env.example .env      # y poner DATABASE_URL, DIRECT_DATABASE_URL y los dos JWT
npm run migrate:dev --workspace apps/api
SEED_DEMO=1 npm run seed --workspace apps/api
npm run dev               # api en :3001, web en :3000
node scripts/dev-proxy.mjs   # todo junto en :8777, como en producción
```

- Sitio público: <http://localhost:8777/>
- VISION OS: <http://localhost:8777/admin>
- Salud: <http://localhost:8777/api/health>

Las extensiones (`btree_gist`, `pg_trgm`, `unaccent`, `uuid-ossp`) las crea la
migración inicial, así que el rol debe poder ejecutar `CREATE EXTENSION`.

---

## Reglas que no se negocian

Cada una existe porque en el ERP de Servimil falta y duele.

**El esquema solo cambia con su migración.** `prisma migrate` desde el commit 1.
`prisma db push` está prohibido contra cualquier cosa que no sea el localhost del
desarrollador. El CI rechaza el PR que toque `schema.prisma` sin una carpeta nueva
en `prisma/migrations/`, y comprueba con `migrate diff` que esquema y migraciones
describan lo mismo.

**El `dist/` nunca se commitea.** El build ocurre en GitHub Actions. Está en
`.gitignore` a propósito.

**`jest --passWithNoTests` está prohibido** y el CI falla si alguien lo repone.

**Todo campo temporal es `@db.Timestamptz(3)`.** Prisma mapea `DateTime` a
`timestamp` sin zona por defecto, y el `EXCLUDE` de la agenda usa `tstzrange`, que
no compila sobre eso. Hay una prueba que lo verifica (`test/schema.spec.ts`).

**`audit_logs` es append-only**, con un trigger que lo impone en la base. Se
registran también las **lecturas** de ficha de paciente: la Ley 1581 obliga a
poder responder quién consultó a quién.

---

## Verificar que un despliegue entró

No sirve que el panel diga "completado". El SHA se hornea en la imagen:

```bash
curl -s https://os.visioncolombia.com.co/api/health | jq .sha
```

Ese valor debe ser el commit que se acaba de subir. El job `verificar` del
workflow de deploy lo comprueba solo y falla si no coincide.

---

## Producción

Frontend en **Vercel**, API en **Hostinger**, Postgres en **Supabase**, y el
gateway de WhatsApp en un proceso permanente aparte.

Los pasos completos, incluidas las dos cadenas de conexión de Supabase y por
qué el gateway no puede ir en Hostinger, están en `docs/DESPLIEGUE.md`.

### Verificar que un despliegue entró

```bash
curl -s https://api.visioncolombia.com.co/api/health | jq .sha
```

Ese valor debe ser el commit que se acaba de subir.

## Estructura

```
apps/api/     NestJS 10 + Prisma 6 + PostgreSQL 16
apps/web/     Next.js + React 19
```

`apps/whatsapp-gateway/` entra en E2 como proceso separado: reiniciar el API no
debe tumbar la sesión de WhatsApp.

El plan completo de fase 1 (E0–E8), el modelo de datos del Core Vision y los
riesgos están en `docs/plan-fase-1.md`.
