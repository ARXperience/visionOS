# Despliegue

**Frontend** en Vercel · **API** en Hostinger · **Postgres** en Supabase ·
**Gateway de WhatsApp** aparte (ver abajo, es el punto que falta cerrar).

```
visioncolombia.com.co            Vercel     sitio público + /admin
api.visioncolombia.com.co        Hostinger  la API
                                 Supabase   Postgres
wa.visioncolombia.com.co         ¿?         gateway de WhatsApp
```

Los tres primeros comparten dominio registrable **a propósito**: es lo que
permite que la sesión siga viajando en una cookie `httpOnly` que el
JavaScript no puede leer. Si el panel quedara en un `*.vercel.app` suelto, la
cookie deja de llegar y habría que pasar el refresh token por cabecera —
es decir, guardarlo en `localStorage`, que cualquier XSS lee. Con historias
clínicas detrás, eso no es una opción.

---

## 1. Supabase

> **La conexión directa `db.<ref>.supabase.co` solo resuelve por IPv6.**
> Si la red desde donde se conecta no tiene salida IPv6 —la mayoría de
> conexiones domésticas y muchos hostings en Colombia—, el puerto 5432 no
> responde y Prisma dice «Can't reach database server» aunque el DNS
> resuelva. Hay que usar el **pooler**, que sí es IPv4:
> `aws-0-<región>.pooler.supabase.com`, con usuario `postgres.<ref>`.
>
> La región del proyecto de Visión Colombia es **us-east-2**, no us-east-1.

1. Proyecto en Supabase.
2. *Settings → Database* y copiar **las dos** cadenas del pooler:
   - **Transaction pooler**, puerto `6543` → `DATABASE_URL`.
     Añadirle `?pgbouncer=true` — sin eso Prisma usa sentencias preparadas
     que pgbouncer en modo transacción rechaza, y falla de forma
     intermitente, que es lo peor que puede fallar.
   - **Session pooler** o conexión directa, puerto `5432` → `DIRECT_DATABASE_URL`.
     Las migraciones necesitan sesión y un lock de aviso que el pooler de
     transacción no soporta.
3. Aplicar el esquema:
   ```bash
   npm run migrate:deploy --workspace apps/api
   npm run seed --workspace apps/api
   ```

Las cuatro extensiones (`btree_gist`, `pg_trgm`, `unaccent`, `uuid-ossp`) las
crea la primera migración. **`btree_gist` no es opcional**: sin ella el
`EXCLUDE` de la agenda no se puede crear y la clínica puede sobrevender un
cupo. Si Supabase la rechazara, hay que saberlo antes de seguir.

> No usar el cliente de Supabase ni sus políticas RLS. Aquí Supabase es
> Postgres gestionado y nada más: la autorización vive en los guards de la
> API, y tener dos sistemas de permisos que hay que mantener de acuerdo es
> como no tener ninguno.

## 2. Hostinger — la API

Hostinger **no compila TypeScript**. La salida obvia sería commitear `dist/`
en `main`, que es lo que hace el ERP de Servimil y produce diffs ilegibles,
conflictos en cada merge y la duda permanente de si lo que corre es lo que
dice el código.

En su lugar, `.github/workflows/deploy.yml` compila en CI y publica el
resultado en una rama aparte, **`deploy-api`**, que se reescribe entera en
cada despliegue. `main` queda limpia.

Configuración en Hostinger:

| Campo | Valor |
|---|---|
| Repositorio | `ARXperience/visionOS` |
| Rama | **`deploy-api`** (no `main`) |
| Comando de arranque | `npm start` |
| Versión de Node | 22 |

`npm start` en esa rama ejecuta `prisma migrate deploy && node dist/main`.
La migración va **antes** a propósito: si falla, el proceso no levanta y la
versión anterior sigue en pie, que es mejor que una API nueva contra un
esquema viejo.

Variables de entorno en el panel de Hostinger:

```
NODE_ENV=production
DATABASE_URL=…6543…?pgbouncer=true
DIRECT_DATABASE_URL=…5432…
JWT_SECRET=…                  # openssl rand -hex 32
JWT_REFRESH_SECRET=…          # otro distinto
CORS_ORIGINS=https://visioncolombia.com.co
COOKIE_DOMAIN=.visioncolombia.com.co
WHATSAPP_AUTH_ENCRYPTION_KEY=…   # openssl rand -hex 32
GATEWAY_URL=https://wa.visioncolombia.com.co
GIT_SHA=                      # lo pone el build
```

**`WHATSAPP_AUTH_ENCRYPTION_KEY` no se puede perder ni cambiar**: cifra las
credenciales de sesión de WhatsApp. Si se pierde, hay que escanear el QR de
nuevo. Guardarla fuera del panel también.

## 3. Vercel — el frontend

| Campo | Valor |
|---|---|
| Repositorio | `ARXperience/visionOS` |
| Framework | Next.js |
| Root Directory | *(la raíz — `vercel.json` ya apunta al workspace)* |
| Dominio | `visioncolombia.com.co` |

Variable de entorno:

```
NEXT_PUBLIC_API_URL=https://api.visioncolombia.com.co/api
```

El panel queda en `/admin` (es el `basePath` de Next). El sitio público de la
clínica sigue siendo el HTML estático que genera `tools/build.py` en el otro
repositorio; para servirlo en la raíz del mismo dominio, un `rewrite` en el
proyecto de Vercel o un proyecto aparte con el dominio y `/admin` reescrito
hacia este.

## 4. El gateway de WhatsApp — lo que falta

**No cabe en Hostinger.** Baileys mantiene una conexión WebSocket viva contra
los servidores de WhatsApp; el hosting de aplicaciones Node reinicia procesos
y no garantiza permanencia. Cada reinicio es una reconexión, y una sesión que
se reconecta a menudo es exactamente el patrón por el que WhatsApp cierra un
número. El de la clínica lleva años en Google Maps y tarjetas.

Lo que **sí** está resuelto y reduce mucho el daño: las credenciales viven
cifradas en Postgres, no en disco. Un reinicio reconecta **sin volver a
escanear el QR**. Eso convierte el problema de "irrecuperable" a "arriesgado".

Tres opciones, de más a menos recomendable:

| Opción | Coste | Nota |
|---|---|---|
| **VPS mínimo solo para el gateway** (Hetzner CX22, Docker) | ~€4/mes | Proceso permanente, disco propio, control total. Es lo que el diseño espera. |
| **Railway / Fly.io** con un servicio siempre activo | ~$5/mes | Funciona; hay que desactivar el escalado a cero. |
| **Hostinger junto a la API** | €0 | Solo si su plan garantiza proceso permanente. Hay que probarlo con el número desechable, nunca con el de la clínica. |

Sea cual sea, el gateway necesita `DATABASE_URL`,
`WHATSAPP_AUTH_ENCRYPTION_KEY` (**la misma que la API**) y escuchar donde
`GATEWAY_URL` apunte. Si queda expuesto a internet, ponerle autenticación:
hoy escucha en `127.0.0.1` porque asume que la API está en la misma máquina.

## 5. Comprobar que un despliegue entró

No sirve que el panel diga «completado»:

```bash
curl -s https://api.visioncolombia.com.co/api/health | jq .sha
```

Ese valor tiene que ser el commit que se acaba de subir. El job `verificar`
del workflow lo comprueba solo y falla si no coincide — para que corra, hay
que definir la variable de repositorio `PUBLIC_API_URL`.

## 6. Copias de seguridad

Supabase hace copias automáticas según el plan. **Programar además una
restauración de prueba mensual**: el backup que nunca se restauró no es un
backup, y aquí hay datos de salud sujetos a la Ley 1581.
