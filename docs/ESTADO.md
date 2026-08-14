# Estado de VISION OS

Última actualización: 14 de agosto de 2026.

## Qué está construido

| Entrega | Qué | Estado |
|---|---|---|
| **E0** | Monorepo, migraciones, auth, CI/CD | Código listo · **no desplegado** |
| **E1** | Core Vision, catálogo, festivos, permisos | Hecho y verificado |
| **E2** | WhatsApp: gateway, inbox, envío, QR | Hecho · **nunca conectado a un número real** |
| **E3** | Agenda multi-recurso, recepción | Hecho y verificado |
| **E4** | Paciente 360 con línea de tiempo | Hecho y verificado |
| **E5** | Asistente con guardarraíl | Construido · **nunca ha respondido a un paciente** |
| **E6** | Recordatorios, confirmación, no-show | Hecho · sin pantalla |
| **E7** | Tablero del día | Hecho y verificado |
| **E8** | Corte a producción | **Pendiente — es de la clínica** |

**66 pruebas** (54 API + 12 gateway), **14 migraciones** aplicadas contra Neon.

## Lo que bloquea que esto llegue a un paciente

Ninguna de estas cinco cosas la puede hacer el código.

1. **Repo remoto en GitHub** (cuenta centrodigitaldediseño). Hoy existe solo
   en un disco. Sin remoto no hay CI, no hay despliegue y no hay copia.
2. **VPS + DNS de `os.visioncolombia.com.co`**. El criterio de E0 es que un
   `git push` llegue solo a producción y `/health` devuelva ese SHA. Sin
   servidor, E0 no se puede cerrar.
3. **SIM nueva**, calentada 2–3 semanas con uso normal antes de conectarla.
   El número de las tarjetas y de Google Maps no es reemplazable, y la
   conexión es por una biblioteca no oficial.
4. **`OPENAI_API_KEY`**. El asistente está construido y su guardarraíl
   probado, pero sin clave no ha contestado nunca. Y su criterio de paso a
   autónomo es medible: ≥60% de sugerencias enviadas sin editar sobre 100
   conversaciones reales.
5. **La hoja de duraciones revisada por la clínica**. Los 44 servicios
   siguen con duración, equipo y dilatación conjeturados por el importador
   desde el sitio web. El sistema lo avisa en pantalla. Agendar con una
   duración inventada desordena la agenda de todo el día.

## Deuda declarada

Marcada en el código con `ponytail:`. Recuperable con `/ponytail-debt`.

- **Sondeo cada 3 s en el inbox** en vez de WebSocket. Cumple el criterio de
  la entrega (mensaje visible en <3 s) para una decena de usuarios. El sitio
  donde cambiarlo es un hook.
- **Cron en proceso** para recordatorios, no una cola. La entrega
  exactamente-una-vez la da el índice único `(appointmentId, kind)`. Habría
  que revisarlo si el API corre en varias instancias.
- **Auth state de WhatsApp en un blob por canal.** Partirlo por clave de
  Signal solo si el estado crece.
- **Desplazamiento horario fijo (UTC-5)** en `enZona()`. Colombia no tiene
  horario de verano. Aislado en una función por si algún día hay sede fuera.
- **`DIRECT_DATABASE_URL` apunta al endpoint agrupado de Neon.** El directo
  no le responde al motor de migraciones. En el VPS, con Postgres local,
  desaparece.
- **Precio del modelo escrito a mano** en `asistente.service.ts`. Si cambia
  el modelo hay que cambiarlo, o el corte de presupuesto deja de funcionar
  sin avisar.

## Lo que deliberadamente no se construye

Facturación electrónica DIAN y RIPS (proveedor autorizado), contabilidad,
pasarela de pagos, firma de consentimientos, app móvil del paciente, portal
con login, BI (Metabase sobre la misma base), telemedicina, gestor
documental, motor de workflows configurable y multi-tenant.

El razonamiento está en `plan-fase-1.md`: cada módulo construido es un
módulo que hay que mantener durante años.

## Cómo levantar todo en local

```bash
npm install
cp .env.example .env          # y poner DATABASE_URL, JWT_SECRET, JWT_REFRESH_SECRET
npm run migrate:dev --workspace apps/api
SEED_DEMO=1 npm run seed --workspace apps/api
npm run dev                                  # api :3001, web :3000
node scripts/dev-proxy.mjs                   # todo junto en :8777
node --import tsx apps/whatsapp-gateway/src/index.ts   # gateway
```

- Sitio público: <http://localhost:8777/>
- VISION OS: <http://localhost:8777/admin>
- Salud: <http://localhost:8777/api/health>
