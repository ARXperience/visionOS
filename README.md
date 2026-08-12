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

Hace falta Docker (para Postgres y Redis) y Node ≥ 20.

```bash
cp .env.example .env          # y editar DATABASE_URL, JWT_SECRET, JWT_REFRESH_SECRET
npm install
docker compose up -d postgres redis
npm run migrate:dev --workspace apps/api
npm run dev                   # api en :3001, web en :3000
curl http://localhost:3001/api/health
```

Sin Docker sirve cualquier Postgres 16 alcanzable: basta apuntar `DATABASE_URL`.
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

Un VPS con Docker Compose: `caddy` (TLS automático) + `api` + `web` + `postgres:16`
+ `redis:7`. Baileys necesita un proceso vivo con estado en disco, así que nada
serverless.

### Puesta a punto del servidor, una sola vez

1. VPS con Docker y Docker Compose.
2. DNS: `os.visioncolombia.com.co` apuntando a su IP.
3. `git clone` del repo en `/srv/vision-os`.
4. `.env` en `/srv/vision-os` con: `POSTGRES_*`, `JWT_SECRET`,
   `JWT_REFRESH_SECRET`, `DOMAIN`, `PUBLIC_URL`, `CORS_ORIGINS`, `GHCR_OWNER`.
5. Secretos en GitHub → *Settings → Secrets → Actions*:
   `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`, `PUBLIC_URL`.

A partir de ahí, cada push a `main` construye las imágenes, las sube a `ghcr.io`,
las despliega por SSH y verifica el SHA. Revertir es cambiar `TAG` a un commit
anterior y `docker compose up -d`.

### Copias de seguridad

`pg_dump` diario cifrado con `age` a Backblaze B2, 30 días de retención, más
snapshot del volumen. **Restauración de prueba mensual agendada**: el backup que
nunca se restauró no es un backup, y aquí hay datos de salud.

---

## Estructura

```
apps/api/     NestJS 10 + Prisma 6 + PostgreSQL 16
apps/web/     Next.js + React 19
```

`apps/whatsapp-gateway/` entra en E2 como proceso separado: reiniciar el API no
debe tumbar la sesión de WhatsApp.

El plan completo de fase 1 (E0–E8), el modelo de datos del Core Vision y los
riesgos están en `docs/plan-fase-1.md`.
