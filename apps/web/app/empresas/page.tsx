'use client';

import { useCallback, useEffect, useState } from 'react';

import { api } from '../../lib/api';

interface Empresa {
  id: string;
  nit: string;
  name: string;
  contactName: string | null;
  contactPhone: string | null;
  _count: { campaigns: number };
}

interface Jornada {
  id: string;
  name: string;
  status: string;
  scheduledAt: string;
  location: string | null;
  expectedPeople: number | null;
  atendidos: number;
  asistencia: number | null;
  requierenValoracion: number;
  yaAgendados: number;
  sinAgendar: number;
  company: { id: string; name: string; contactName: string | null; contactPhone: string | null };
  site: { code: string } | null;
  participants: {
    id: string;
    finding: string | null;
    needsFollowUp: boolean;
    person: { id: string; displayName: string; phone: string | null };
  }[];
}

interface Pendiente {
  personId: string;
  paciente: string;
  telefono: string | null;
  hallazgo: string | null;
  empresa: string;
  jornada: string;
  diasDesde: number;
}

const fecha = (s: string) =>
  new Date(s).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });

export default function Empresas() {
  const [jornadas, setJornadas] = useState<Jornada[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [pendientes, setPendientes] = useState<Pendiente[]>([]);
  const [abierta, setAbierta] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    try {
      const [j, e, p] = await Promise.all([
        api.get<Jornada[]>('/campanas'),
        api.get<Empresa[]>('/campanas/empresas'),
        api.get<Pendiente[]>('/campanas/pendientes'),
      ]);
      setJornadas(j);
      setEmpresas(e);
      setPendientes(p);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  async function accion(fn: () => Promise<unknown>) {
    setError(null);
    try {
      await fn();
      await cargar();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <>
      <span className="miga">Comercial</span>
      <h1>Campañas empresariales</h1>
      <p className="sub" style={{ maxWidth: 760 }}>
        Jornadas de tamizaje en empresas. Una jornada no son muchas citas: es un compromiso propio
        —&ldquo;vamos el martes y esperan sesenta personas&rdquo;— y lo que se mide es cuántos
        aparecieron. Cada hallazgo sí crea su paciente: una jornada cuyos hallazgos se quedan en una
        planilla es una jornada regalada.
      </p>

      {error && <p className="error" role="alert">{error}</p>}

      {pendientes.length > 0 && (
        <div className="aviso" style={{ marginTop: 14, borderColor: '#B4261A' }}>
          <b>{pendientes.length} persona(s) con hallazgo que nunca agendaron.</b> Es el entregable
          real de las jornadas.
          <table className="tabla" style={{ marginTop: 8 }}>
            <thead><tr><th>Persona</th><th>Teléfono</th><th>Hallazgo</th><th>Empresa</th><th>Hace</th></tr></thead>
            <tbody>
              {pendientes.slice(0, 15).map((p) => (
                <tr key={p.personId}>
                  <td>{p.paciente}</td>
                  <td className="tenue">{p.telefono ?? '—'}</td>
                  <td className="tenue">{p.hallazgo ?? '—'}</td>
                  <td className="tenue">{p.empresa}</td>
                  <td>{p.diasDesde} d</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <NuevaJornada empresas={empresas} alCrear={cargar} />

      <div style={{ marginTop: 18, display: 'grid', gap: 8 }}>
        {jornadas.map((j) => (
          <div key={j.id} className="fila-lista">
            <div className="cabecera-fila" onClick={() => setAbierta(abierta === j.id ? null : j.id)} role="button" tabIndex={0}>
              <div>
                <strong>{j.name}</strong> <span className="tenue">· {j.company.name}</span>
                <div className="tenue" style={{ fontSize: '0.8rem' }}>
                  {fecha(j.scheduledAt)}
                  {j.location ? ` · ${j.location}` : ''}
                  {j.company.contactName ? ` · ${j.company.contactName}` : ''}
                  {j.company.contactPhone ? ` ${j.company.contactPhone}` : ''}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <strong>{j.atendidos}{j.expectedPeople ? ` / ${j.expectedPeople}` : ''}</strong>
                <div className="tenue" style={{ fontSize: '0.78rem' }}>
                  {j.status.toLowerCase()}
                  {j.asistencia !== null && ` · ${j.asistencia}% asistencia`}
                </div>
                {j.sinAgendar > 0 && (
                  <div style={{ color: '#B4261A', fontSize: '0.78rem' }}>{j.sinAgendar} sin agendar</div>
                )}
              </div>
            </div>

            {abierta === j.id && (
              <div style={{ padding: '4px 14px 16px' }}>
                <div className="tarjetas" style={{ marginTop: 8 }}>
                  <div className="tarjeta"><strong>{j.atendidos}</strong><span className="tenue">Atendidos</span></div>
                  <div className="tarjeta"><strong>{j.requierenValoracion}</strong><span className="tenue">Requieren valoración</span></div>
                  <div className="tarjeta"><strong>{j.yaAgendados}</strong><span className="tenue">Ya agendaron</span></div>
                </div>

                <Registrar campaignId={j.id} alRegistrar={cargar} />

                {j.participants.length > 0 && (
                  <table className="tabla" style={{ marginTop: 12 }}>
                    <thead><tr><th>Persona</th><th>Hallazgo</th><th /></tr></thead>
                    <tbody>
                      {j.participants.map((p) => (
                        <tr key={p.id}>
                          <td>
                            {p.person.displayName}
                            <div className="tenue" style={{ fontSize: '0.76rem' }}>{p.person.phone ?? '—'}</div>
                          </td>
                          <td className="tenue">{p.finding ?? '—'}</td>
                          <td>
                            {p.needsFollowUp && (
                              <span className="etiqueta" style={{ borderColor: '#B4261A' }}>requiere valoración</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                <div className="acciones" style={{ marginTop: 12 }}>
                  {['CONFIRMADA', 'EJECUTADA', 'CANCELADA']
                    .filter((s) => s !== j.status)
                    .map((s) => (
                      <button
                        key={s}
                        className={`btn-mini${s === 'CANCELADA' ? ' peligro' : ''}`}
                        type="button"
                        onClick={() => void accion(() => api.post(`/campanas/${j.id}/estado`, { status: s }))}
                      >
                        Marcar {s.toLowerCase()}
                      </button>
                    ))}
                </div>
              </div>
            )}
          </div>
        ))}
        {!jornadas.length && <p className="tenue">No hay jornadas registradas.</p>}
      </div>
    </>
  );
}

function NuevaJornada({ empresas, alCrear }: { empresas: Empresa[]; alCrear: () => void }) {
  const [abierto, setAbierto] = useState(false);
  const [modo, setModo] = useState<'jornada' | 'empresa'>('jornada');
  const [error, setError] = useState<string | null>(null);
  const [j, setJ] = useState({ companyId: '', name: '', scheduledAt: '', location: '', expectedPeople: '' });
  const [e, setE] = useState({ nit: '', name: '', contactName: '', contactPhone: '' });

  return (
    <>
      <div className="acciones" style={{ marginTop: 20 }}>
        <button className="btn-mini" type="button" onClick={() => { setAbierto(!abierto); setModo('jornada'); }}>
          {abierto && modo === 'jornada' ? 'Cancelar' : 'Nueva jornada'}
        </button>
        <button className="btn-mini" type="button" onClick={() => { setAbierto(true); setModo('empresa'); }}>
          Nueva empresa ({empresas.length})
        </button>
      </div>

      {abierto && modo === 'empresa' && (
        <div className="panel-agendar" style={{ marginTop: 12, maxWidth: 620 }}>
          <div className="rejilla-form">
            <label>NIT<input value={e.nit} onChange={(x) => setE({ ...e, nit: x.target.value })} /></label>
            <label>Razón social<input value={e.name} onChange={(x) => setE({ ...e, name: x.target.value })} /></label>
            <label>Contacto<input value={e.contactName} onChange={(x) => setE({ ...e, contactName: x.target.value })} /></label>
            <label>Teléfono<input value={e.contactPhone} onChange={(x) => setE({ ...e, contactPhone: x.target.value })} /></label>
          </div>
          {error && <p className="error" role="alert">{error}</p>}
          <div className="acciones" style={{ marginTop: 10 }}>
            <button
              className="btn-mini"
              type="button"
              disabled={!e.nit || !e.name}
              onClick={() =>
                void api
                  .post('/campanas/empresas', {
                    nit: e.nit,
                    name: e.name,
                    contactName: e.contactName || undefined,
                    contactPhone: e.contactPhone || undefined,
                  })
                  .then(() => {
                    setE({ nit: '', name: '', contactName: '', contactPhone: '' });
                    setError(null);
                    setAbierto(false);
                    alCrear();
                  })
                  .catch((x: Error) => setError(x.message))
              }
            >
              Guardar empresa
            </button>
          </div>
        </div>
      )}

      {abierto && modo === 'jornada' && (
        <div className="panel-agendar" style={{ marginTop: 12, maxWidth: 620 }}>
          <div className="rejilla-form">
            <label>
              Empresa
              <select value={j.companyId} onChange={(x) => setJ({ ...j, companyId: x.target.value })}>
                <option value="">Elija…</option>
                {empresas.map((emp) => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
              </select>
            </label>
            <label>Nombre de la jornada<input value={j.name} onChange={(x) => setJ({ ...j, name: x.target.value })} /></label>
            <label>Fecha<input type="datetime-local" value={j.scheduledAt} onChange={(x) => setJ({ ...j, scheduledAt: x.target.value })} /></label>
            <label>Lugar<input value={j.location} onChange={(x) => setJ({ ...j, location: x.target.value })} /></label>
            <label>
              Personas que esperan <span className="tenue">(el denominador)</span>
              <input type="number" min={1} value={j.expectedPeople} onChange={(x) => setJ({ ...j, expectedPeople: x.target.value })} />
            </label>
          </div>
          {error && <p className="error" role="alert">{error}</p>}
          <div className="acciones" style={{ marginTop: 10 }}>
            <button
              className="btn-mini"
              type="button"
              disabled={!j.companyId || !j.name || !j.scheduledAt}
              onClick={() =>
                void api
                  .post('/campanas', {
                    companyId: j.companyId,
                    name: j.name,
                    scheduledAt: new Date(j.scheduledAt).toISOString(),
                    location: j.location || undefined,
                    expectedPeople: j.expectedPeople ? Number(j.expectedPeople) : undefined,
                  })
                  .then(() => {
                    setJ({ companyId: '', name: '', scheduledAt: '', location: '', expectedPeople: '' });
                    setError(null);
                    setAbierto(false);
                    alCrear();
                  })
                  .catch((x: Error) => setError(x.message))
              }
            >
              Crear jornada
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function Registrar({ campaignId, alRegistrar }: { campaignId: string; alRegistrar: () => void }) {
  const [d, setD] = useState({ documento: '', nombre: '', apellido: '', telefono: '', finding: '', needsFollowUp: false });
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="panel-agendar" style={{ marginTop: 12 }}>
      <h4 style={{ margin: 0, fontSize: '0.9rem' }}>Registrar persona atendida</h4>
      <div className="rejilla-form" style={{ marginTop: 8 }}>
        <label>Documento<input value={d.documento} onChange={(e) => setD({ ...d, documento: e.target.value })} /></label>
        <label>Nombre<input value={d.nombre} onChange={(e) => setD({ ...d, nombre: e.target.value })} /></label>
        <label>Apellido<input value={d.apellido} onChange={(e) => setD({ ...d, apellido: e.target.value })} /></label>
        <label>Teléfono<input value={d.telefono} onChange={(e) => setD({ ...d, telefono: e.target.value })} /></label>
        <label>Hallazgo<input value={d.finding} onChange={(e) => setD({ ...d, finding: e.target.value })} /></label>
      </div>
      <label className="interno" style={{ marginTop: 8 }}>
        <input type="checkbox" checked={d.needsFollowUp} onChange={(e) => setD({ ...d, needsFollowUp: e.target.checked })} />
        Requiere valoración en consultorio
        <span className="tenue"> — solo estos entran a la lista de a quién llamar</span>
      </label>
      {error && <p className="error" role="alert">{error}</p>}
      <div className="acciones" style={{ marginTop: 10 }}>
        <button
          className="btn-mini"
          type="button"
          disabled={!d.documento || !d.nombre}
          onClick={() =>
            void api
              .post(`/campanas/${campaignId}/participantes`, {
                documento: d.documento,
                nombre: d.nombre,
                apellido: d.apellido || undefined,
                telefono: d.telefono || undefined,
                finding: d.finding || undefined,
                needsFollowUp: d.needsFollowUp,
              })
              .then(() => {
                setD({ documento: '', nombre: '', apellido: '', telefono: '', finding: '', needsFollowUp: false });
                setError(null);
                alRegistrar();
              })
              .catch((e: Error) => setError(e.message))
          }
        >
          Registrar
        </button>
      </div>
    </div>
  );
}
