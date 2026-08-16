'use client';

import { useCallback, useEffect, useState } from 'react';

import { useSesion } from '../../components/marco';
import { api } from '../../lib/api';

interface Profesional {
  id: string;
  displayName: string;
  docNumber: string;
  type: string;
  licenseNumber: string | null;
  specialties: string[];
  color: string | null;
  isActive: boolean;
  sites: { site: { id: string; code: string; name: string } }[];
  services: { serviceId: string; durationMin: number | null }[];
  availabilities: {
    id: string;
    weekday: number;
    startMinute: number;
    endMinute: number;
    site: { id: string; code: string };
  }[];
}

interface Servicio {
  id: string;
  name: string;
  businessLine: string;
  durationMin: number;
}

interface Sede {
  id: string;
  code: string;
  name: string;
}

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

const TIPOS = [
  ['OFTALMOLOGO', 'Oftalmólogo'],
  ['OPTOMETRA', 'Optómetra'],
  ['ORTOPTISTA', 'Ortoptista'],
  ['ANESTESIOLOGO', 'Anestesiólogo'],
  ['ENFERMERIA', 'Enfermería'],
  ['ESTETICA', 'Estética'],
  ['OTRO', 'Otro'],
];

const hora = (min: number) =>
  `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

export default function Profesionales() {
  const sesion = useSesion();
  const [lista, setLista] = useState<Profesional[] | null>(null);
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [abierto, setAbierto] = useState<string | null>(null);
  const [creando, setCreando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const cargar = useCallback(
    () =>
      api
        .get<Profesional[]>('/profesionales')
        .then(setLista)
        .catch((e: Error) => setError(e.message)),
    [],
  );

  useEffect(() => {
    void cargar();
    void api.get<Servicio[]>('/catalogo/servicios').then(setServicios).catch(() => undefined);
    void api.get<Sede[]>('/catalogo/sedes').then(setSedes).catch(() => undefined);
  }, [cargar]);

  const puede = sesion.permissions.includes('schedule.manage');

  async function accion(fn: () => Promise<unknown>, mensaje?: string) {
    setError(null);
    setAviso(null);
    try {
      const r = (await fn()) as { aviso?: string } | undefined;
      setAviso(r?.aviso ?? mensaje ?? null);
      await cargar();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <>
      <span className="miga">Recursos</span>
      <h1>Profesionales y horarios</h1>
      <p className="sub">
        Quién atiende, qué presta y en qué franjas. Es lo que la agenda necesita para existir: sin
        franja no hay cupos, y sin servicio asignado no aparece aunque tenga hueco.
      </p>

      {error && <p className="error" role="alert">{error}</p>}
      {aviso && <p className="ok" role="status">{aviso}</p>}

      {puede && (
        <div className="filtros">
          <button className="btn-mini" type="button" onClick={() => setCreando(true)}>
            Añadir profesional
          </button>
        </div>
      )}

      {creando && (
        <Crear
          sedes={sedes}
          alCerrar={() => setCreando(false)}
          alCrear={() => {
            setCreando(false);
            setAviso('Profesional creado. Asígnele servicios y horarios para que aparezca en la agenda.');
            void cargar();
          }}
        />
      )}

      {lista?.map((p) => {
        const listo = p.services.length > 0 && p.availabilities.length > 0;
        return (
          <section key={p.id} className={`prof ${p.isActive ? '' : 'inactivo'}`}>
            <header>
              <span className="punto-color" style={{ background: p.color ?? '#cbd5e1' }} />
              <div>
                <b>{p.displayName}</b>
                <span className="tenue">
                  {TIPOS.find((t) => t[0] === p.type)?.[1] ?? p.type} · CC {p.docNumber}
                  {p.licenseNumber ? ` · RM ${p.licenseNumber}` : ''}
                </span>
              </div>

              {!listo && p.isActive && (
                <em className="estado construccion" title="No aparecerá en la disponibilidad">
                  {p.services.length === 0 ? 'sin servicios' : 'sin horario'}
                </em>
              )}
              {!p.isActive && <em className="estado planeado">Inactivo</em>}

              <div className="acciones" style={{ marginLeft: 'auto' }}>
                <button className="btn-mini" type="button" onClick={() => setAbierto(abierto === p.id ? null : p.id)}>
                  {abierto === p.id ? 'Cerrar' : 'Configurar'}
                </button>
                {puede && (
                  <button
                    className="btn-mini"
                    type="button"
                    onClick={() =>
                      void accion(() => api.post(`/profesionales/${p.id}/estado`, { activo: !p.isActive }))
                    }
                  >
                    {p.isActive ? 'Desactivar' : 'Activar'}
                  </button>
                )}
              </div>
            </header>

            <div className="prof-resumen">
              <span className="tenue">
                {p.sites.map((s) => s.site.code).join(', ')} · {p.services.length} servicios ·{' '}
                {p.availabilities.length} franjas
              </span>
              {p.specialties.length > 0 && (
                <span>
                  {p.specialties.map((e) => (
                    <i key={e} className="pill gris">
                      {e.toLowerCase()}
                    </i>
                  ))}
                </span>
              )}
            </div>

            {abierto === p.id && (
              <Configurar
                profesional={p}
                servicios={servicios}
                sedes={sedes}
                puede={puede}
                alCambiar={cargar}
                alError={setError}
                alAviso={setAviso}
              />
            )}
          </section>
        );
      })}

      {lista?.length === 0 && (
        <p className="aviso">
          No hay profesionales. Sin ellos la agenda no puede ofrecer ningún cupo.
        </p>
      )}
    </>
  );
}

function Configurar({
  profesional: p,
  servicios,
  sedes,
  puede,
  alCambiar,
  alError,
  alAviso,
}: {
  profesional: Profesional;
  servicios: Servicio[];
  sedes: Sede[];
  puede: boolean;
  alCambiar: () => Promise<void>;
  alError: (s: string) => void;
  alAviso: (s: string | null) => void;
}) {
  const [sel, setSel] = useState<string[]>(p.services.map((s) => s.serviceId));
  const [dia, setDia] = useState(1);
  const [sede, setSede] = useState(p.sites[0]?.site.id ?? '');
  const [ini, setIni] = useState('08:00');
  const [fin, setFin] = useState('12:00');

  const porLinea = servicios.reduce<Record<string, Servicio[]>>((a, s) => {
    (a[s.businessLine] ??= []).push(s);
    return a;
  }, {});

  const intentar = async (fn: () => Promise<unknown>, msg?: string) => {
    alError('');
    try {
      const r = (await fn()) as { aviso?: string } | undefined;
      alAviso(r?.aviso ?? msg ?? null);
      await alCambiar();
    } catch (e) {
      alError((e as Error).message);
    }
  };

  return (
    <div className="prof-config">
      <div>
        <h3 className="grupo-titulo">Servicios que presta ({sel.length})</h3>
        <p className="tenue" style={{ fontSize: '0.82rem', margin: '0 0 10px' }}>
          Sin marcar un servicio, no aparece en su disponibilidad aunque tenga la franja libre.
        </p>
        <div className="servicios-check">
          {Object.entries(porLinea).map(([linea, lista]) => (
            <details key={linea}>
              <summary>
                {linea.toLowerCase()} <span className="tenue">({lista.filter((s) => sel.includes(s.id)).length}/{lista.length})</span>
              </summary>
              {lista.map((s) => (
                <label key={s.id}>
                  <input
                    type="checkbox"
                    disabled={!puede}
                    checked={sel.includes(s.id)}
                    onChange={(e) => setSel((v) => (e.target.checked ? [...v, s.id] : v.filter((x) => x !== s.id)))}
                  />
                  {s.name} <span className="tenue">{s.durationMin} min</span>
                </label>
              ))}
            </details>
          ))}
        </div>
        {puede && (
          <button
            className="btn-mini"
            type="button"
            style={{ marginTop: 10 }}
            onClick={() => void intentar(() => api.post(`/profesionales/${p.id}/servicios`, { serviceIds: sel }), 'Servicios actualizados.')}
          >
            Guardar servicios
          </button>
        )}
      </div>

      <div>
        <h3 className="grupo-titulo">Horario semanal</h3>
        {p.availabilities.length === 0 && (
          <p className="tenue" style={{ fontSize: '0.85rem' }}>Sin franjas: no ofrece ningún cupo.</p>
        )}
        <ul className="franjas">
          {p.availabilities.map((f) => (
            <li key={f.id}>
              <b>{DIAS[f.weekday]}</b>
              <span>
                {hora(f.startMinute)} – {hora(f.endMinute)}
              </span>
              <i className="pill gris">{f.site.code}</i>
              {puede && (
                <button
                  type="button"
                  className="quitar"
                  title="Quitar franja"
                  onClick={() => void intentar(() => quitar(`/profesionales/franjas/${f.id}`), 'Franja quitada.')}
                >
                  ×
                </button>
              )}
            </li>
          ))}
        </ul>

        {puede && (
          <div className="fila-agendar" style={{ marginTop: 12 }}>
            <select value={dia} onChange={(e) => setDia(Number(e.target.value))}>
              {DIAS.map((d, n) => (
                <option key={d} value={n}>
                  {d}
                </option>
              ))}
            </select>
            <select value={sede} onChange={(e) => setSede(e.target.value)}>
              {p.sites.map((s) => (
                <option key={s.site.id} value={s.site.id}>
                  {s.site.code}
                </option>
              ))}
            </select>
            <input type="time" value={ini} onChange={(e) => setIni(e.target.value)} />
            <input type="time" value={fin} onChange={(e) => setFin(e.target.value)} />
            <button
              className="btn-mini"
              type="button"
              onClick={() =>
                void intentar(
                  () => api.post(`/profesionales/${p.id}/franjas`, { siteId: sede, weekday: dia, inicio: ini, fin }),
                  'Franja añadida.',
                )
              }
            >
              Añadir franja
            </button>
          </div>
        )}

        <Bloqueos profesional={p} sedes={sedes} puede={puede} alCambiar={alCambiar} alError={alError} alAviso={alAviso} />
      </div>
    </div>
  );
}

function Bloqueos({
  profesional: p,
  puede,
  alError,
  alAviso,
}: {
  profesional: Profesional;
  sedes: Sede[];
  puede: boolean;
  alCambiar: () => Promise<void>;
  alError: (s: string) => void;
  alAviso: (s: string | null) => void;
}) {
  const [lista, setLista] = useState<{ id: string; startsAt: string; endsAt: string; blockReason: string | null; site: { code: string } }[]>([]);
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [motivo, setMotivo] = useState('');

  const cargar = useCallback(
    () => api.get<typeof lista>(`/profesionales/${p.id}/bloqueos`).then(setLista).catch(() => undefined),
    [p.id],
  );

  useEffect(() => {
    void cargar();
  }, [cargar]);

  return (
    <>
      <h3 className="grupo-titulo" style={{ marginTop: 22 }}>
        Ausencias y bloqueos
      </h3>
      <p className="tenue" style={{ fontSize: '0.82rem', margin: '0 0 10px' }}>
        Vacaciones, congreso, incapacidad. Si ya hay una cita en ese rango, la base lo rechaza en
        vez de dejar al paciente con una cita que nadie va a atender.
      </p>

      <ul className="franjas">
        {lista.map((b) => (
          <li key={b.id}>
            <b>{new Date(b.startsAt).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}</b>
            <span>
              → {new Date(b.endsAt).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}
            </span>
            <span className="tenue">{b.blockReason}</span>
            {puede && (
              <button
                type="button"
                className="quitar"
                onClick={() =>
                  void quitar(`/profesionales/bloqueos/${b.id}`).then(() => {
                    alAviso('Bloqueo quitado.');
                    void cargar();
                  })
                }
              >
                ×
              </button>
            )}
          </li>
        ))}
        {lista.length === 0 && <li className="tenue">Sin ausencias registradas.</li>}
      </ul>

      {puede && (
        <div className="fila-agendar" style={{ marginTop: 10 }}>
          <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
          <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
          <input value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Motivo" maxLength={120} />
          <button
            className="btn-mini"
            type="button"
            disabled={!desde || !hasta || motivo.length < 3}
            onClick={() =>
              void api
                .post(`/profesionales/${p.id}/bloqueos`, {
                  siteId: p.sites[0].site.id,
                  desde: `${desde}T05:00:00.000Z`,
                  hasta: `${hasta}T23:59:00.000Z`,
                  motivo,
                })
                .then(() => {
                  setMotivo('');
                  alAviso('Bloqueo registrado.');
                  void cargar();
                })
                .catch((e: Error) => alError(e.message))
            }
          >
            Bloquear
          </button>
        </div>
      )}
    </>
  );
}

function Crear({ sedes, alCerrar, alCrear }: { sedes: Sede[]; alCerrar: () => void; alCrear: () => void }) {
  const [siteIds, setSiteIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="panel-agendar"
      onSubmit={(e) => {
        e.preventDefault();
        const d = new FormData(e.currentTarget);
        void api
          .post('/profesionales', {
            docNumber: String(d.get('docNumber')),
            firstName: String(d.get('firstName')),
            lastName: String(d.get('lastName')),
            type: String(d.get('type')),
            licenseNumber: String(d.get('licenseNumber') || '') || undefined,
            specialties: String(d.get('specialties') || '')
              .split(',')
              .map((s) => s.trim().toUpperCase())
              .filter(Boolean),
            color: String(d.get('color')),
            siteIds,
          })
          .then(alCrear)
          .catch((x: Error) => setError(x.message));
      }}
    >
      <h2 style={{ fontSize: '1.05rem', marginBottom: 14 }}>Añadir profesional</h2>

      <div className="rejilla-form">
        <label>
          Nombre<input name="firstName" required minLength={2} />
        </label>
        <label>
          Apellido<input name="lastName" required minLength={2} />
        </label>
        <label>
          Documento<input name="docNumber" required minLength={4} />
        </label>
        <label>
          Registro médico<input name="licenseNumber" placeholder="lo exigirá RIPS" />
        </label>
        <label>
          Tipo
          <select name="type" defaultValue="OFTALMOLOGO">
            {TIPOS.map(([v, t]) => (
              <option key={v} value={v}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label>
          Color en la agenda<input name="color" type="color" defaultValue="#0e93b4" />
        </label>
      </div>

      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--mute)' }}>
        Subespecialidades (separadas por coma)
        <input name="specialties" placeholder="RETINA, GLAUCOMA" style={{ marginTop: 5, fontWeight: 400 }} />
      </label>

      <fieldset className="sedes-check" style={{ marginTop: 12 }}>
        <legend>Sedes donde atiende</legend>
        {sedes.map((s) => (
          <label key={s.id}>
            <input
              type="checkbox"
              checked={siteIds.includes(s.id)}
              onChange={(e) => setSiteIds((v) => (e.target.checked ? [...v, s.id] : v.filter((x) => x !== s.id)))}
            />
            {s.name}
          </label>
        ))}
      </fieldset>

      {error && <p className="error" role="alert">{error}</p>}

      <div className="acciones" style={{ marginTop: 16 }}>
        <button className="btn-mini" type="submit" disabled={!siteIds.length}>
          Crear
        </button>
        <button className="btn-mini" type="button" onClick={alCerrar}>
          Cancelar
        </button>
      </div>
    </form>
  );
}

const quitar = (ruta: string) => api.del<{ aviso?: string }>(ruta);
