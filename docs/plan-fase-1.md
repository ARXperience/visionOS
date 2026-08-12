# VISION OS — Fase 1

## Contexto

Visión Colombia es una clínica oftalmológica con **3 sedes** (Bogotá Altos del Bosque,
Bogotá Teusaquillo, Ibagué Interlaken) y **41 servicios** en 6 líneas de negocio.
Hoy su único activo digital es un **sitio estático** (`C:\Users\centr\Desktop\claude code\visioncolombia`,
57 páginas generadas por `tools/build.py` desde `content.json`): informa, pero no captura
nada. La conversación de WhatsApp, la cita, el examen, la cirugía y el cobro viven fuera
de cualquier sistema común, y nada de eso se puede ver junto para un mismo paciente.

El objetivo es que el **Paciente 360°** sea el núcleo y todo lo demás cuelgue de él.
No 26 aplicaciones: un Core Vision con base común de personas, sedes, servicios,
profesionales, agenda, conversaciones y eventos.

### Lo que ya existe y cambia el plan

El usuario **ya opera un ERP en producción**: `C:\Users\centr\Desktop\Github\Servimil ERP Pull`
(monorepo "servimil-os", NestJS 10 + Prisma 6 + PostgreSQL 16 + Next.js 16, 755 commits,
Vercel + Hostinger). Resuelve, con tráfico real, las tres cosas más caras de construir:

- **WhatsApp con Baileys** — `apps/api/src/modules/whatsapp/`, 11.241 líneas. De ellas
  ~3.950 son núcleo transportable; ~5.100 son dominio Servimil (crédito, tickets, Sheets).
- **AI Hub** — de sus 5.389 líneas, reutilizables ~650: el router de modelos, las métricas
  de costo y la matriz de permisos. Cuatro de sus 17 archivos son stubs de 4 líneas.
- **La plataforma** — auth JWT+refresh, guards, auditoría, notificaciones, colas BullMQ,
  WebSockets, y **el inbox web** (`app/(dashboard)/whatsapp/`, 3.938 líneas), que es el
  mayor ahorro de frontend. El kit shadcn son 21 archivos, no vale la pena copiarlo.

Un segundo repo, `C:\Users\centr\Desktop\CDD OS`, es un prototipo local nunca desplegado
(15 commits, dominio de agencia de software). No sirve como base. Aporta tres piezas:
`packages/auth/src/tenant.ts` con sus **45 tests**, el **auth state cifrado AES-256-GCM**
de su adaptador Baileys, y `packages/ai/src/prompt-registry.ts` (versión + rollback).

### Decisiones tomadas

| Decisión | Elección |
|---|---|
| Historia Clínica Electrónica | **Fuera de fase 1.** Se modela el dato clínico mínimo. |
| Facturación DIAN / FEV-RIPS | **Después.** El esquema ya lleva los campos que exigirán. |
| Primer corte | WhatsApp → Inbox+IA → Lead → Paciente 360° → Agenda → recordatorio → check-in → no-show |
| Conector WhatsApp | **Baileys (QR)**, sesión propia aislada del API |
| Líneas de WhatsApp | **Una central**, con enrutado por intención y sede |
| Día 1 | **Las 3 sedes a la vez**, ~10–20 usuarios |

---

## Arranque: repo nuevo, copia selectiva

**`vision-os`, monorepo pnpm+Turbo, `git init` limpio.** No fork, no monorepo compartido
con Servimil.

- **No fork**: heredaría 105 modelos ajenos, 30 `DIAGNOSTICO_*.md`, `temp.js` de 572 KB y
  —lo grave— la **ausencia de `prisma/migrations/`**, que es justo el defecto a no repetir.
- **No paquetes compartidos**: extraer `@servimil/whatsapp-core` obliga a refactorizar un
  ERP en producción sin tests antes de escribir la primera línea de la clínica, y acopla
  dos negocios distintos. La divergencia entre ambos bots no es un costo: es el objetivo.

```
vision-os/
├─ apps/api/              NestJS 10 + Prisma (migrations desde el commit 1)
├─ apps/whatsapp-gateway/ proceso separado: reiniciar el API no tumba la sesión
├─ apps/web/              Next 16 App Router
├─ docker-compose.yml     caddy + api + web + gateway + postgres:16 + redis:7
└─ scripts/seed-catalogo.ts
```

---

## Core Vision — el modelo de datos

Esquema nuevo escrito a mano (~20 modelos), no copiado. Convenciones del ERP:
`uuid_generate_v4()`, `@map` snake_case, `@@map` plural.
**`@db.Timestamptz(3)` en todo lo temporal** — Prisma mapea a `timestamp` sin zona por
defecto y `tstzrange` no compila sobre eso.

### La agenda multi-recurso, que es la parte difícil

Una cita de OCT ocupa a la vez **profesional + consultorio + equipo**. Se modela con una
tabla `ResourceBooking`: **una fila por recurso ocupado**, todas con el mismo rango.

```prisma
model ResourceBooking {
  id             String  @id @default(dbgenerated("uuid_generate_v4()")) @db.Uuid
  appointmentId  String? @map("appointment_id") @db.Uuid   // null = bloqueo
  siteId         String  @map("site_id") @db.Uuid
  professionalId String? @map("professional_id") @db.Uuid  // exactamente uno
  roomId         String? @map("room_id") @db.Uuid          // de los tres
  equipmentId    String? @map("equipment_id") @db.Uuid
  kind           ResourceKind
  startsAt       DateTime @map("starts_at") @db.Timestamptz(3)  // incluye buffer
  endsAt         DateTime @map("ends_at")   @db.Timestamptz(3)
  active         Boolean  @default(true)
  blockReason    String?  @map("block_reason")
}
```

Vacaciones, almuerzo y mantenimiento de equipo son filas con `appointmentId = null`:
la misma tabla y la misma garantía, sin código extra.

**La no-superposición la impone PostgreSQL, no la aplicación** (`prisma/sql/2026-08-12_core_vision_constraints.sql`):

```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE resource_bookings ADD CONSTRAINT rb_one_resource CHECK (
  (professional_id IS NOT NULL)::int + (room_id IS NOT NULL)::int
+ (equipment_id IS NOT NULL)::int = 1);

ALTER TABLE resource_bookings ADD CONSTRAINT rb_no_overlap EXCLUDE USING gist (
  COALESCE(professional_id, room_id, equipment_id) WITH =,
  tstzrange(starts_at, ends_at, '[)')              WITH &&
) WHERE (active);

CREATE UNIQUE INDEX persons_mrn_key ON persons (mrn) WHERE is_patient AND mrn IS NOT NULL;
CREATE INDEX persons_name_trgm ON persons USING gin (unaccent(display_name) gin_trgm_ops);

REVOKE UPDATE, DELETE, TRUNCATE ON audit_logs, data_consents FROM visionos_app;
REVOKE DELETE, TRUNCATE ON appointment_status_events, diagnoses, service_results FROM visionos_app;
```

**Por qué `EXCLUDE` y no bloqueo optimista:** el conflicto no es "dos personas editan la
misma cita" sino "dos personas crean citas distintas que se solapan" — no hay fila
compartida sobre la que versionar. Simularlo exige una tabla de mutex con `SELECT FOR UPDATE`
en *todos* los caminos de escritura (API, importador, worker de lista de espera, la IA de
WhatsApp); uno que se olvide y hay doble reserva. El `EXCLUDE` vive en el motor, bloquea
solo los rangos en conflicto y cuesta cero líneas: un `catch` de `23P01` traducido a
"ese cupo se acaba de ocupar".

Dos límites aceptados: capacidad 1 por recurso (una sala para 4 pacientes se modela como
4 filas `Room`), y `active=false` debe escribirse en la misma transacción que la
cancelación — una sola función `cancelAppointment()` hace las dos cosas.

### Multi-sede: `siteId` en lo operativo, nunca en lo identitario

Esto **no es multi-tenant**. Es una IPS con tres sedes y un paciente que se atiende en
las tres. Por eso no se arrastra la maquinaria de `organizationId` de CDD OS: se toma su
`scopeWhere` —que **rechaza** la consulta cruzada en vez de reescribirla— y se aplica a `siteId`.

| Global, sin `siteId` | Aislado, `siteId NOT NULL` |
|---|---|
| `Person`, `Coverage`, `DataConsent` | `Appointment`, `ResourceBooking`, `Room`, `Equipment` |
| `Payer`, `Service`, `ServicePrice`* | `WaitlistEntry`, `ProfessionalAvailability` |
| `ServiceOrder`, `ServiceResult`, `Diagnosis` | (futuro) caja, factura, inventario |

\* `ServicePrice.siteId` nullable: `null` = tarifa de red, con fila = excepción por sede.

- **Sin RLS en fase 1.** Las tablas de identidad no tienen discriminador por diseño; RLS
  sería pelear contra el modelo. Entra cuando haya usuarios externos, sobre `person_id`.
- **La lectura de paciente es global pero auditada.** Recepción de Ibagué debe poder
  buscar a un paciente de Teusaquillo. Lo que contiene no es un filtro: es que cada
  apertura de ficha escribe `AuditLog(action=READ, personId, siteId)`.
- Un retinólogo que atiende en dos sedes no puede ser agendado a la misma hora en ambas:
  el `EXCLUDE` sobre `professional_id` ya lo impide, gratis.

### Timeline del Paciente 360°

`PatientEvent` es una **proyección de solo lectura, desechable y reconstruible**, escrita
en la misma transacción que el cambio que la origina. No es event sourcing.

Se gana: la pantalla es `SELECT ... WHERE person_id = $1 ORDER BY occurred_at DESC LIMIT 50`.
Cuando entren facturación, óptica o cirugía, **insertan una fila** y aparecen en el timeline
sin tocar la consulta. Con un UNION de 15 tablas, cada módulo nuevo obliga a reescribir la
consulta más cara del sistema.

Se pierde: es dato duplicado y puede derivar. Mitigación en tres pasos — una sola función
`emit()` escribe ahí; **el script de reconstrucción se escribe en el mismo PR que la tabla**;
y nunca se lee para tomar decisiones.

### Modelos del núcleo

`Person` · `Payer` · `Coverage` · `DataConsent` · `Site` · `Room` · `Equipment` ·
`Professional` · `ProfessionalSite` · `ProfessionalAvailability` · `Service` ·
`ServiceProfessional` · `ServicePrice` · `Appointment` · `ResourceBooking` ·
`AppointmentStatusEvent` · `AppointmentNotification` · `WaitlistEntry` · `Channel` ·
`Conversation` · `Message` · `Lead` · `PatientEvent` · `ServiceOrder` · `ServiceResult` ·
`Cie10` · `Diagnosis` · `User` · `UserSiteAccess` · `RefreshToken` · `AuditLog`

No obvios y deliberados:
- **`Person` única y global, creada en el primer mensaje de WhatsApp.** `isPatient` es una
  bandera, no otra tabla. La alternativa (Lead suelto que "se convierte") obliga a
  re-parentar conversaciones y mensajes justo en el punto que el usuario quiere ver.
  Incluye `mergedIntoId` desde el día 1: van a duplicar personas, garantizado.
- **`Professional` separado de `User`**: hay profesionales que no entran al sistema y
  usuarios (recepción) que no atienden.
- **Ganchos DIAN/RIPS ya puestos**, porque retrollenarlos sobre 20.000 pacientes es el
  trabajo que esto evita: nombre en 4 componentes, `docType` RIPS, DIVIPOLA + zona,
  `Payer.nit`+`dv`, `Service.cupsCode`, `Professional.licenseNumber`,
  `Site.habilitationCode`, `Appointment.authorizationNumber`.
- **`AppointmentStatusEvent`** es la fuente de verdad del recorrido y de los indicadores
  (oportunidad, espera, no-show). Sin ella habría que instrumentar retroactivamente.

⚠ **`Diagnosis` con CIE-10 y `ServiceResult` con informe ya son historia clínica** bajo la
Res. 1995/1999: conservación de 15 años, prohibición de borrado, registro de accesos y
firma del profesional. El esquema lo contempla. **Si el equipo no va a operar bajo esas
reglas desde el día uno, dejen `Diagnosis` fuera** y guarden solo la orden y el archivo.

---

## Inventario de extracción

**Copia limpia** — `apps/api/src/common/{guards,decorators,dto,filters,interceptors,utils}/`
(incluye `whatsapp-phone.util.ts`, normalización de números colombianos), `modules/auth/`,
`modules/audit/`, `modules/notifications/`, `prisma/prisma.service.ts`, `websockets/`,
`events/`, `queues/queues.module.ts`; en web: `lib/{axios,api-unwrap,format,utils,media-url}.ts`,
`providers/`, `stores/`, `app/(auth)/`, `components/whatsapp/media-attachment.tsx`.
Y `67_HORARIOS_Y_FESTIVOS_COLOMBIA.md` — festivos colombianos ya resueltos.

**Adaptación media** — `whatsapp-session.manager.ts` (1.420), `whatsapp.service.ts` (1.734),
`conversation-assignment.service.ts` (asignar por sede), `modules/reminders/`,
`ai-router.service.ts`; en web, el inbox `app/(dashboard)/whatsapp/` → `app/(dashboard)/inbox/`
y `sessions/` → `admin/whatsapp/`.

**Reescritura** — `whatsapp-ai.service.ts` (2.882 → `modules/ai/emilia.service.ts`): se
rescata el bucle de tool-calling (~300 líneas) y el prompt pasa a vivir en BD, no en el
archivo. `lib/roles.ts` y el enum `UserRole`. `app.module.ts` importa 8 módulos, no 27.

**Desde CDD OS** — `packages/auth/src/tenant.ts` → `common/scope.ts` (`scopeWhere` sobre
`siteId`) **con sus 45 tests**, que es lo que acaba con el `--passWithNoTests`;
`permissions.ts` (se copia la forma `<recurso>.<acción>`, se reescribe el catálogo);
el **auth state cifrado AES-256-GCM** injertado en el session manager, porque
`useMultiFileAuthState` escribe credenciales en texto plano en disco y se pierden al
recrear el contenedor; y `prompt-registry.ts`.

**Fuera** — `whatsapp-crm-sync` (1.834), `bot-functions` (1.349), `ai-tools.service.ts`
(1.524), `ai-voice` (940), los 4 stubs, `modules/documents/ocr`, los 19 módulos de dominio
Servimil, los 19 `prisma/sql/*.sql`, `prisma/runtime-client/`, y en web
`whatsapp/pipeline/` (1.049) y `lib/{agente,agente-v2,sicod,nomina-module,...}`.

**Dos implementaciones de Baileys, gana la del ERP.** Con una biblioteca de ingeniería
inversa, lo que vale es el conocimiento ganado a golpes en producción, y está en sus
comentarios (`typingPauseMs = 250` — "sin ella WhatsApp deja caer mensajes en silencio").
**No se copia la interfaz `whatsapp-provider.ts`**: una interfaz con una sola
implementación no acelera la migración a Cloud API, porque lo lento de esa migración es
la aprobación de plantillas. La puerta queda abierta donde importa y es caro cambiarla —
el enum `ChannelProvider` y el modelo `Channel` en el esquema.

---

## Fase 1 en entregas verificables

El criterio de listo no es un commit. Es **cinco días hábiles seguidos con cero citas
agendadas fuera de VISION OS.**

**E0 · Esqueleto desplegado (días 1-3).** Repo, compose, `prisma migrate dev --name init`
con 5 modelos, auth copiado, CI/CD.
*Verificación:* `git push` y seis minutos después `curl https://os.visioncolombia.com.co/api/health`
devuelve 200 con el SHA de ese commit, y `prisma migrate deploy` corrió solo al arrancar
el contenedor. **Si el despliegue exige que un humano copie un `dist/`, la entrega no está
lista** — la deuda de Hostinger se paga aquí, no al final.

**E1 · Catálogo, personas, permisos (días 3-6).** Sedes, los 41 servicios, profesionales,
horarios, festivos. Permisos granulares portados. Auditoría en todo write y en toda lectura
de ficha.
*Verificación:* `/admin/servicios` muestra 41 servicios en 6 líneas y 3 sedes. Un rol
`RECEPCION` recibe 403 al borrar un paciente y el intento queda en `audit_logs` con actor
e IP. `pnpm test` corre los 45 tests portados y el CI falla si alguien repone `--passWithNoTests`.
*Aviso:* `content.json` está indexado por slug de página con HTML mezclado; el seed necesita
parser one-shot **y revisión humana**. Duración por servicio y quién lo presta no están en
la web. Medio día más una hoja revisada por la clínica.

**E2 · WhatsApp + inbox humano, sin IA (semanas 2-3).** Gateway Baileys en contenedor
propio, auth state cifrado en Postgres, inbox con push por Socket.IO, media en ambos
sentidos, horario de atención.
*Verificación, de un día completo:* recepción cierra WhatsApp Web y trabaja una jornada
entera desde `/inbox`. Al cierre se compara el historial del teléfono contra `messages`:
**cero mensajes perdidos**. Y `docker compose down && up` reconecta **sin volver a escanear el QR**.

**E3 · Agenda multi-sede + check-in (semanas 3-5).** Motor de disponibilidad
(`ProfessionalAvailability` × duración × festivos × bloqueos), vista día/semana por sede,
check-in, estados con su historial.
*Verificación:* se agenda **un día real completo de las 3 sedes** en paralelo a lo actual y
al cierre coincide 1:1, cita por cita. Test de concurrencia: dos `POST /citas` simultáneos
para el mismo recurso → uno falla con `23P01`, no con un `if` del servicio.
`GET /disponibilidad?fecha=2026-12-25` devuelve vacío.

**E4 · Paciente 360 + lead (semanas 5-6).** Vinculación conversación→persona por teléfono
normalizado, ficha con timeline, `Lead` con origen, webhook desde el sitio estático para
`agendar-cita.html`, `contacto.html` y `pqrsf.html`.
*Verificación:* un número nuevo escribe → aparece Lead; el formulario del sitio en
producción llega al inbox etiquetado. Sobre una semana real: **>90% de leads vinculados a
una persona**. Menos que eso significa que la normalización de teléfonos falla.

**E5 · Emilia oftalmológica, primero copiloto (semanas 6-8).** Prompt en BD con
`prompt-registry`. **Cinco herramientas y ni una más**: `buscar_servicio`,
`consultar_disponibilidad`, `agendar_cita`, `reagendar_cita`, `escalar_a_humano`.
Modelo barato para clasificar, caro solo al agendar.
*Verificación:* **Modo A (copiloto)** sobre 100 conversaciones reales, se mide el % de
sugerencias enviadas sin editar. **Si es menor a 60%, no se activa el modo autónomo**; se
itera el prompt, que por eso vive en BD. **Modo B**: "quiero cita de optometría en la sede
norte el jueves en la tarde" produce una cita correcta sin que nadie toque un teclado.
**Guardarraíl en CI que bloquea el merge:** 20 mensajes tipo "me duele el ojo, ¿qué me
tomo?" → 20 de 20 escalan a humano, cero consejo clínico.

**E6 · Recordatorio, confirmación, no-show, lista de espera (semanas 8-9).** Jobs BullMQ a
T-24h y T-2h, parseo de respuesta, liberación del cupo al cancelar, oferta al siguiente de
la lista.
*Verificación funcional:* se responde "2" al recordatorio y el cupo aparece libre en
segundos. *Verificación real:* la tasa de no-show del mes anterior contra el primer mes con
recordatorios. Si no baja, el problema es el texto y la hora del mensaje, no el código.

**E7 · Tablero del día (semana 9).** Una pantalla: citas de hoy por sede y estado,
confirmadas vs. pendientes, no-shows, conversaciones sin responder hace 15 minutos, leads
sin tocar.
*Verificación:* la administradora la abre a las 8:00 y no necesita preguntarle nada a nadie
en todo el día. Tres números validados contra conteo manual.

**E8 · Corte (semana 10).** Migración del histórico, capacitación de las 3 sedes, y **fecha
en el calendario** para apagar lo anterior.
*Verificación:* cinco días hábiles con cero citas agendadas fuera del sistema.

---

## Riesgos

**R1 · Baneo del número (crítico).** Baileys es ingeniería inversa y viola los términos de
Meta. El número de la clínica lleva años en Google Maps y tarjetas: **no es reemplazable**.
Agrava que el ERP corre `^7.0.0-rc13` — un release candidate con caret.
→ El número principal **no se conecta primero**: SIM nueva calentada 2-3 semanas con
tráfico humano real. Los recordatorios son el mayor riesgo, no el inbox (salientes, en
lote, a números que no iniciaron conversación): cola con jitter, tope por hora, solo
diurno, solo a quien ya conversó. Versión **pinneada exacta**. Cuenta de Meta Cloud API
creada y **plantillas aprobadas en frío antes de necesitarlas** — la aprobación tarda días.
Alarma a un humano en <60 s si la sesión cae con `loggedOut` o 403.
→ *Con una sola línea central el riesgo queda concentrado: un baneo deja a las 3 sedes sin
canal.* El session manager ya soporta 10 sesiones; tener una segunda línea de respaldo
verificada y en frío no cuesta desarrollo.

**R2 · Ley 1581, datos sensibles de salud (crítico).** Sanciones SIC hasta 2.000 SMLMV.
→ Consentimiento como **registro con el texto exacto de la versión aceptada**, no un
booleano. Registro de la base ante la SIC (RNBD). Al LLM se envía el texto del mensaje,
**no la cédula ni el historial**; contrato de encargo y zero-retention. Cifrado en reposo y
en backups. Auditoría de **lecturas** de ficha. Procedimiento escrito de supresión.

**R3 · La clínica operando en dos sitios a la vez (alto, y el más probable).** Es una
muerte lenta: doble digitación, números que no cuadran, y a los tres meses nadie confía en
ninguno de los dos.
→ **Cada entrega tiene fecha de corte y apaga su pedazo de lo anterior.** Máximo **dos
semanas** de operación en paralelo por módulo; si al cabo no se puede apagar lo viejo, la
entrega está mal hecha — se arregla, no se extiende el paralelo. Un responsable **con
nombre** dentro de la clínica firma cada corte.
→ *Con las 3 sedes entrando a la vez no hay piloto que absorba los errores y no hay vuelta
atrás fácil.* La migración del histórico debe estar completa y verificada **antes** del
corte, y E3 se ensaya un día entero en paralelo con las tres sedes antes de cortar.

**R4 · Ausencia de migraciones en el repo origen (alto).**
→ `prisma migrate` desde el commit 1. `prisma db push` **prohibido** fuera de localhost.
Todo PR que toque `schema.prisma` trae su migración o no se mergea. Prueba mensual:
`docker compose down -v && up && migrate deploy && seed` desde cero.

**R5 · Costo y latencia del LLM (medio).** Router barato/caro, métricas desde el día 1,
presupuesto con corte duro que degrada a "un humano te responde" en vez de reventar la tarjeta.

**R6 · Dependencia de una sola persona (medio).** Tests en las tres rutas que mueven citas
(disponibilidad, agendar, recordatorio) y un README de despliegue ejecutable por un tercero.

---

## Infraestructura

**Un solo VPS con Docker Compose.** Baileys necesita un proceso vivo con estado en memoria
y disco persistente: Vercel y Lambda no sirven. Y partir el sistema entre dos hostings es
exactamente cómo se llegó a "compilar a mano y commitear `dist/`".

| Componente | Elección | Costo/mes |
|---|---|---|
| Servidor | Hetzner CPX21 (3 vCPU, 4 GB, 80 GB NVMe), Ashburn — ~80 ms a Colombia | ~€8,5 |
| Orquestación | compose: caddy + api + web + gateway + postgres:16 + redis:7 | €0 |
| CI/CD | GitHub Actions → `ghcr.io` → SSH `compose pull && up -d && migrate deploy` | €0 |
| Backups | `pg_dump` diario cifrado con `age` → Backblaze B2, 30 días + snapshot Hetzner | ~€1,5 |
| Media de WhatsApp | Cloudflare R2 (10 GB y egreso gratis) | $0 |
| Monitoreo | UptimeRobot + alerta de sesión caída | $0 |
| LLM | OpenAI/Anthropic según volumen | $20-60 |
| **Total** | | **~US$35-80**, dominado por la IA |

**Nunca más commitear `dist/`**: el build ocurre en Actions. Un despliegue son 5 minutos y
se revierte cambiando el tag de la imagen. **Restauración de prueba mensual agendada** —
el backup que nunca se restauró no es un backup. El sitio público `visioncolombia` sigue
donde está; solo el sistema interno va al VPS.

---

## Lo que NO se construye

Cada módulo construido es un módulo que hay que mantener durante años.

| Pedido | En su lugar |
|---|---|
| HCE | Comprar. Es un producto completo con certificación, no un módulo. |
| Facturación DIAN + RIPS | Alegra / Siigo / Factus por API (~$25-60/mes), ya autorizados |
| Contabilidad y nómina | Siigo / Alegra |
| Pasarela de pagos | Link de Wompi o Bold por el mismo WhatsApp. Cero alcance PCI. |
| Firma de consentimientos | ZapSign por API. Con validez probatoria que un `<canvas>` propio no tiene. |
| **App móvil del paciente** | **No construir.** WhatsApp ya es la app y ya está instalada. |
| Portal del paciente con login | Igual: nadie recuerda otra contraseña para ver la hora de una cita |
| BI / reportes avanzados | **Metabase** en el mismo compose contra la misma base. Cero código. |
| Telemedicina | Un link de Meet en el campo de la cita |
| Encuestas / NPS | Un WhatsApp post-consulta con 3 opciones. ~40 líneas dentro de citas. |
| Pantalla de turnos | Ruta pública `/turnos/:sede` que consulta cada 10 s. Un archivo. |
| Gestor documental | Carpeta en R2 + campo en la cita |
| Motor de workflows configurable | Reglas en código hasta que existan diez reales |
| Multi-tenant / vender a otras clínicas | No. Si aparece la segunda, esa refactorización la paga la segunda. |

Lo que sí se construye porque nadie lo vende bien: **el inbox con IA acoplado a la agenda
multi-sede**. Ese es el producto. El resto es integrar o cortar.

---

## Verificación de extremo a extremo

Cuando la fase 1 esté completa, esta secuencia debe funcionar sin intervención:

1. Un número desconocido escribe al WhatsApp de la clínica *"quiero información de cataratas"*.
2. Se crea `Person` + `Conversation` + `Lead`, y aparece en `/inbox` en menos de 3 s.
3. Emilia responde, detecta el interés y ofrece valoración (nunca cirugía directa).
4. Consulta disponibilidad real y agenda: se crean `Appointment` + 2-3 `ResourceBooking`.
5. El `EXCLUDE` impide que otro agende el mismo consultorio a esa hora — probado con dos
   `POST` concurrentes que devuelven 201 y 409.
6. A T-24h sale el recordatorio; el paciente responde "1" y la cita pasa a `CONFIRMADA`.
7. Recepción hace check-in; los estados quedan en `AppointmentStatusEvent`.
8. La ficha del paciente muestra los 7 pasos anteriores en **una sola consulta** a
   `patient_events`.
9. El tablero de `/hoy` refleja todo lo anterior por sede.
10. `docker compose down -v && up && migrate deploy && seed` reconstruye el sistema desde
    cero, y el script de reconstrucción regenera `patient_events` idéntico.
