'use client';

import { useCallback, useEffect, useState } from 'react';

import { useSesion } from '../../components/marco';
import { api } from '../../lib/api';

interface Radicado {
  id: string;
  radicado: string;
  tipo: string;
  estado: string;
  asunto: string;
  detalle: string;
  contacto: string | null;
  nombre: string | null;
  dueDate: string;
  respuesta: string | null;
  respondedAt: string | null;
  satisfaccion: number | null;
  createdAt: string;
  person: { id: string; displayName: string; phone: string | null } | null;
  site: { code: string } | null;
  service: { name: string } | null;
  assignedTo: { firstName: string; lastName: string } | null;
}

interface Indicadores {
  porTipo: Record<string, number>;
  porEstado: Record<string, number>;
  vencidasSinResponder: number;
  respondidas: number;
  dentroDePlazo: number;
  cumplimiento: number | null;
  satisfaccionMedia: number | null;
}

const TIPO: Record<string, string> = {
  PETICION: 'Petición',
  QUEJA: 'Queja',
  RECLAMO: 'Reclamo',
  SUGERENCIA: 'Sugerencia',
  FELICITACION: 'Felicitación',
};

const ESTADO: Record<string, { texto: string; clase: string }> = {
  RADICADA: { texto: 'Radicada', clase: 'construccion' },
  EN_GESTION: { texto: 'En gestión', clase: 'construccion' },
  RESPONDIDA: { texto: 'Respondida', clase: 'disponible' },
  CERRADA: { texto: 'Cerrada', clase: 'planeado' },
};

const fecha = (iso: string) =>
  new Date(iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });

const diasPara = (iso: string) =>
  Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);

export default function Pqrsf() {
  const sesion = useSesion();
  const [lista, setLista] = useState<Radicado[] | null>(null);
  const [ind, setInd] = useState<Indicadores | null>(null);
  const [estado, setEstado] = useState('');
  const [vencidas, setVencidas] = useState(false);
  const [radicando, setRadicando] = useState(false);
  const [abierto, setAbierto] = useState<Radicado | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const cargar = useCallback(() => {
    const q = new URLSearchParams();
    if (estado) q.set('estado', estado);
    if (vencidas) q.set('vencidas', 'true');
    return Promise.all([
      api.get<Radicado[]>(`/pqrsf?${q}`).then(setLista),
      api.get<Indicadores>('/pqrsf/indicadores').then(setInd),
    ]).catch((e: Error) => setError(e.message));
  }, [estado, vencidas]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const puede = sesion.permissions.includes('patient.write');

  async function accion(fn: () => Promise<unknown>, msg: string) {
    setError(null);
    setAviso(null);
    try {
      await fn();
      setAviso(msg);
      setAbierto(null);
      await cargar();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <>
      <span className="miga">Pacientes</span>
      <h1>PQRSF</h1>
      <p className="sub">
        Peticiones, quejas, reclamos, sugerencias y felicitaciones. El plazo se calcula en días
        hábiles descontando festivos: contar corridos da una fecha que la clínica cree cumplir y no
        cumple.
      </p>

      {error && <p className="error" role="alert">{error}</p>}
      {aviso && <p className="ok" role="status">{aviso}</p>}

      {ind && (
        <div className="cifras">
          <div className={`cifra ${ind.vencidasSinResponder > 0 ? 'ojo' : ''}`}>
            <b>{ind.vencidasSinResponder}</b>
            <span>Vencidas sin responder</span>
          </div>
          <div className="cifra">
            <b>{(ind.porEstado.RADICADA ?? 0) + (ind.porEstado.EN_GESTION ?? 0)}</b>
            <span>Abiertas</span>
          </div>
          <div className="cifra">
            <b>{ind.cumplimiento === null ? '—' : `${ind.cumplimiento}%`}</b>
            <span>Respondidas dentro del plazo</span>
          </div>
          <div className="cifra">
            <b>{ind.satisfaccionMedia ?? '—'}</b>
            <span>Satisfacción media (1–5)</span>
          </div>
        </div>
      )}

      <div className="filtros">
        <select value={estado} onChange={(e) => setEstado(e.target.value)}>
          <option value="">Todos los estados</option>
          {Object.entries(ESTADO).map(([v, e]) => (
            <option key={v} value={v}>
              {e.texto}
            </option>
          ))}
        </select>
        <label className="interno">
          <input type="checkbox" checked={vencidas} onChange={(e) => setVencidas(e.target.checked)} />
          Solo vencidas
        </label>
        {puede && (
          <button className="btn-mini" type="button" onClick={() => setRadicando(true)}>
            Radicar
          </button>
        )}
      </div>

      {radicando && (
        <Radicar
          alCerrar={() => setRadicando(false)}
          alRadicar={(r) => {
            setRadicando(false);
            setAviso(`Radicado ${r.radicado}. Vence el ${fecha(r.dueDate)}.`);
            void cargar();
          }}
        />
      )}

      {abierto && (
        <Detalle
          r={abierto}
          puede={puede}
          alCerrar={() => setAbierto(null)}
          alResponder={(texto) =>
            accion(
              () => api.post(`/pqrsf/${abierto.id}/responder`, { respuesta: texto }),
              'Respuesta registrada.',
            )
          }
          alCerrarCaso={(s) =>
            accion(() => api.post(`/pqrsf/${abierto.id}/cerrar`, { satisfaccion: s }), 'Caso cerrado.')
          }
        />
      )}

      <table className="tabla" style={{ marginTop: 18 }}>
        <thead>
          <tr>
            <th style={{ width: 140 }}>Radicado</th>
            <th style={{ width: 120 }}>Tipo</th>
            <th>Asunto</th>
            <th style={{ width: 170 }}>Quién</th>
            <th style={{ width: 150 }}>Plazo</th>
            <th style={{ width: 130 }}>Estado</th>
          </tr>
        </thead>
        <tbody>
          {lista?.map((r) => {
            const e = ESTADO[r.estado] ?? { texto: r.estado, clase: 'planeado' };
            const dias = diasPara(r.dueDate);
            const abierta = ['RADICADA', 'EN_GESTION'].includes(r.estado);
            return (
              <tr key={r.id} onClick={() => setAbierto(r)} style={{ cursor: 'pointer' }}>
                <td>
                  <b>{r.radicado}</b>
                  <div className="tenue" style={{ fontSize: '0.76rem' }}>
                    {fecha(r.createdAt)}
                  </div>
                </td>
                <td className="tenue">{TIPO[r.tipo] ?? r.tipo}</td>
                <td>
                  {r.asunto}
                  {r.site && <span className="tenue"> · {r.site.code}</span>}
                </td>
                <td className="tenue" style={{ fontSize: '0.83rem' }}>
                  {r.person?.displayName ?? r.nombre ?? 'anónimo'}
                  <div style={{ fontSize: '0.76rem' }}>{r.contacto ?? r.person?.phone}</div>
                </td>
                <td>
                  {abierta ? (
                    <span style={{ color: dias < 0 ? 'var(--danger)' : dias <= 3 ? '#8a6410' : 'var(--mute)' }}>
                      {dias < 0 ? `vencida hace ${-dias} d` : `${dias} días`}
                    </span>
                  ) : (
                    <span className="tenue" style={{ fontSize: '0.8rem' }}>
                      {r.respondedAt ? `respondida ${fecha(r.respondedAt)}` : '—'}
                    </span>
                  )}
                </td>
                <td>
                  <em className={`estado ${e.clase}`}>{e.texto}</em>
                </td>
              </tr>
            );
          })}
          {lista?.length === 0 && (
            <tr>
              <td colSpan={6} className="tenue">
                Sin radicados con esos filtros.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </>
  );
}

function Radicar({
  alCerrar,
  alRadicar,
}: {
  alCerrar: () => void;
  alRadicar: (r: { radicado: string; dueDate: string }) => void;
}) {
  const [sedes, setSedes] = useState<{ id: string; name: string }[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void api.get<typeof sedes>('/catalogo/sedes').then(setSedes).catch(() => undefined);
  }, []);

  return (
    <form
      className="panel-agendar"
      onSubmit={(e) => {
        e.preventDefault();
        const d = new FormData(e.currentTarget);
        void api
          .post<{ radicado: string; dueDate: string }>('/pqrsf', {
            tipo: String(d.get('tipo')),
            asunto: String(d.get('asunto')),
            detalle: String(d.get('detalle')),
            nombre: String(d.get('nombre') || '') || undefined,
            contacto: String(d.get('contacto') || '') || undefined,
            siteId: String(d.get('siteId') || '') || undefined,
          })
          .then(alRadicar)
          .catch((x: Error) => setError(x.message));
      }}
    >
      <h2 style={{ fontSize: '1.05rem', marginBottom: 14 }}>Radicar</h2>

      <div className="rejilla-form">
        <label>
          Tipo
          <select name="tipo" defaultValue="QUEJA">
            {Object.entries(TIPO).map(([v, t]) => (
              <option key={v} value={v}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label>
          Sede
          <select name="siteId" defaultValue="">
            <option value="">Sin especificar</option>
            {sedes.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Nombre de quien radica
          <input name="nombre" maxLength={120} />
        </label>
        <label>
          Contacto (teléfono o correo)
          <input name="contacto" maxLength={120} placeholder="para poder responder" />
        </label>
      </div>

      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--mute)' }}>
        Asunto
        <input name="asunto" required minLength={4} maxLength={200} style={{ marginTop: 5, fontWeight: 400 }} />
      </label>

      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--mute)', marginTop: 12 }}>
        Detalle
        <textarea name="detalle" required minLength={10} rows={5} className="prompt" style={{ marginTop: 5 }} />
      </label>

      {error && <p className="error" role="alert">{error}</p>}

      <div className="acciones">
        <button className="btn-mini" type="submit">
          Radicar
        </button>
        <button className="btn-mini" type="button" onClick={alCerrar}>
          Cancelar
        </button>
      </div>
    </form>
  );
}

function Detalle({
  r,
  puede,
  alCerrar,
  alResponder,
  alCerrarCaso,
}: {
  r: Radicado;
  puede: boolean;
  alCerrar: () => void;
  alResponder: (texto: string) => Promise<void>;
  alCerrarCaso: (s: number | undefined) => Promise<void>;
}) {
  const [texto, setTexto] = useState('');
  const [satisfaccion, setSatisfaccion] = useState<number | undefined>();

  return (
    <div className="panel-agendar">
      <h2 style={{ fontSize: '1.05rem' }}>
        {r.radicado} · {TIPO[r.tipo]}
      </h2>
      <p className="tenue" style={{ fontSize: '0.85rem', margin: '6px 0 14px' }}>
        {r.asunto} — vence el {fecha(r.dueDate)}
        {r.assignedTo && ` · asignada a ${r.assignedTo.firstName}`}
      </p>

      <p style={{ whiteSpace: 'pre-wrap', fontSize: '0.92rem', margin: 0 }}>{r.detalle}</p>

      {r.respuesta && (
        <div className="aviso" style={{ background: '#e6f7ec', borderColor: '#bde5c9', color: '#1c6b39' }}>
          <b>Respuesta del {fecha(r.respondedAt!)}:</b>
          <div style={{ whiteSpace: 'pre-wrap', marginTop: 6 }}>{r.respuesta}</div>
        </div>
      )}

      {puede && !r.respuesta && (
        <>
          <textarea
            className="prompt"
            rows={5}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Respuesta al paciente…"
            style={{ marginTop: 14 }}
          />
          <p className="tenue" style={{ fontSize: '0.8rem', margin: '0 0 10px' }}>
            Solo se puede responder una vez: sobrescribir la respuesta borraría la prueba de si se
            cumplió el plazo.
          </p>
        </>
      )}

      <div className="acciones" style={{ marginTop: 12 }}>
        {puede && !r.respuesta && (
          <button className="btn-mini" type="button" disabled={texto.length < 10} onClick={() => void alResponder(texto)}>
            Responder
          </button>
        )}
        {puede && r.respuesta && r.estado !== 'CERRADA' && (
          <>
            <select value={satisfaccion ?? ''} onChange={(e) => setSatisfaccion(Number(e.target.value) || undefined)}>
              <option value="">Satisfacción (opcional)</option>
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <button className="btn-mini" type="button" onClick={() => void alCerrarCaso(satisfaccion)}>
              Cerrar caso
            </button>
          </>
        )}
        <button className="btn-mini" type="button" onClick={alCerrar}>
          Cerrar
        </button>
      </div>
    </div>
  );
}
