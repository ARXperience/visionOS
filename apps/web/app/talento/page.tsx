'use client';

import { useCallback, useEffect, useState } from 'react';

import { api } from '../../lib/api';

interface Alertas {
  vencidas: { profesional: string; tipo: string; vencio: string }[];
  porVencer: { profesional: string; tipo: string; vence: string; dias: number }[];
  sinRegistrar: { profesional: string; falta: string[] }[];
  profesionalesActivos: number;
}

interface Profesional {
  id: string;
  displayName: string;
  type: string;
  licenseNumber: string | null;
  isActive: boolean;
}

interface Credencial {
  id: string;
  kind: string;
  number: string | null;
  issuedBy: string | null;
  issuedAt: string | null;
  expiresAt: string | null;
  enlace: string | null;
  diasParaVencer: number | null;
}

const TIPOS = [
  'TARJETA_PROFESIONAL',
  'RETHUS',
  'ESPECIALIZACION',
  'POLIZA_RESPONSABILIDAD',
  'CARNET_VACUNACION',
  'CURSO_SOPORTE_VITAL',
  'EXAMEN_OCUPACIONAL',
  'CONTRATO',
  'OTRO',
];

const legible = (s: string) => s.replace(/_/g, ' ').toLowerCase();

export default function Personal() {
  const [alertas, setAlertas] = useState<Alertas | null>(null);
  const [profesionales, setProfesionales] = useState<Profesional[]>([]);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    try {
      const [a, p] = await Promise.all([
        api.get<Alertas>('/personal/alertas'),
        api.get<Profesional[]>('/profesionales'),
      ]);
      setAlertas(a);
      setProfesionales(p.filter((x) => x.isActive));
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  return (
    <>
      <span className="miga">Administración</span>
      <h1>Talento humano</h1>
      <p className="sub" style={{ maxWidth: 760 }}>
        Solo las credenciales, y a propósito. Nómina, contratación y desempeño se compran; las
        vacaciones y ausencias ya son bloqueos de la agenda, que es lo que de verdad importa —que no
        se le pueda agendar un paciente a alguien que no está.
        <br />
        Lo que no vende nadie es esto: saber, antes de la visita de habilitación, quién está
        atendiendo con la póliza vencida.
      </p>

      {error && <p className="error" role="alert">{error}</p>}

      {alertas && (
        <>
          {alertas.vencidas.length > 0 && (
            <div className="aviso" style={{ marginTop: 14, borderColor: '#B4261A' }}>
              <b>{alertas.vencidas.length} credencial(es) vencidas.</b> Un profesional atendiendo sin
              póliza vigente es un problema legal de la IPS, no suyo.
              <ul style={{ margin: '6px 0 0 18px', fontSize: '0.85rem' }}>
                {alertas.vencidas.map((v, i) => (
                  <li key={i}>{v.profesional} · {legible(v.tipo)} · venció el {v.vencio}</li>
                ))}
              </ul>
            </div>
          )}

          {alertas.sinRegistrar.length > 0 && (
            <div className="aviso" style={{ marginTop: 12 }}>
              {/* Lo que falta no aparece en ninguna lista de documentos, y por
                  eso nadie lo echa de menos hasta la visita. */}
              <b>Faltan documentos por cargar.</b>
              <ul style={{ margin: '6px 0 0 18px', fontSize: '0.85rem' }}>
                {alertas.sinRegistrar.map((s, i) => (
                  <li key={i}>{s.profesional}: {s.falta.map(legible).join(', ')}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="tarjetas" style={{ marginTop: 16 }}>
            <div className="tarjeta" style={alertas.vencidas.length ? { borderColor: '#B4261A' } : undefined}>
              <strong style={{ fontSize: '1.6rem' }}>{alertas.vencidas.length}</strong>
              <span className="tenue">Vencidas</span>
            </div>
            <div className="tarjeta">
              <strong style={{ fontSize: '1.6rem' }}>{alertas.porVencer.length}</strong>
              <span className="tenue">Vencen en 60 días</span>
            </div>
            <div className="tarjeta">
              <strong style={{ fontSize: '1.6rem' }}>{alertas.profesionalesActivos}</strong>
              <span className="tenue">Profesionales activos</span>
            </div>
          </div>

          {alertas.porVencer.length > 0 && (
            <>
              <h2 style={{ fontSize: '1rem', marginTop: 24 }}>Hay que renovar</h2>
              <table className="tabla">
                <thead><tr><th>Profesional</th><th>Documento</th><th>Vence</th><th>Faltan</th></tr></thead>
                <tbody>
                  {alertas.porVencer.map((p, i) => (
                    <tr key={i}>
                      <td>{p.profesional}</td>
                      <td className="tenue">{legible(p.tipo)}</td>
                      <td>{p.vence}</td>
                      <td style={p.dias < 15 ? { color: '#B4261A' } : undefined}>{p.dias} días</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </>
      )}

      <h2 style={{ fontSize: '1rem', marginTop: 28 }}>Profesionales</h2>
      <div style={{ display: 'grid', gap: 8 }}>
        {profesionales.map((p) => (
          <Ficha key={p.id} p={p} alCambiar={cargar} />
        ))}
      </div>
    </>
  );
}

function Ficha({ p, alCambiar }: { p: Profesional; alCambiar: () => void }) {
  const [abierto, setAbierto] = useState(false);
  const [creds, setCreds] = useState<Credencial[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [nueva, setNueva] = useState({ kind: 'TARJETA_PROFESIONAL', number: '', expiresAt: '' });

  const cargarCreds = useCallback(async () => {
    try {
      setCreds(await api.get<Credencial[]>(`/personal/${p.id}/credenciales`));
    } catch (e) {
      setError((e as Error).message);
    }
  }, [p.id]);

  useEffect(() => {
    if (abierto) void cargarCreds();
  }, [abierto, cargarCreds]);

  return (
    <div className="fila-lista">
      <div className="cabecera-fila" onClick={() => setAbierto(!abierto)} role="button" tabIndex={0}>
        <div>
          <strong>{p.displayName}</strong>
          <div className="tenue" style={{ fontSize: '0.8rem' }}>
            {legible(p.type)}
            {p.licenseNumber ? ` · registro ${p.licenseNumber}` : ''}
          </div>
        </div>
        <span className="tenue" style={{ fontSize: '0.8rem' }}>{abierto ? 'cerrar' : 'credenciales'}</span>
      </div>

      {abierto && (
        <div style={{ padding: '4px 14px 16px' }}>
          {error && <p className="error" role="alert">{error}</p>}

          <table className="tabla">
            <thead><tr><th>Documento</th><th>Número</th><th>Vence</th><th /></tr></thead>
            <tbody>
              {creds.map((c) => (
                <tr key={c.id}>
                  <td>{legible(c.kind)}</td>
                  <td className="tenue">{c.number ?? '—'}</td>
                  <td
                    style={
                      c.diasParaVencer !== null && c.diasParaVencer < 0
                        ? { color: '#B4261A', fontWeight: 600 }
                        : undefined
                    }
                  >
                    {c.expiresAt?.slice(0, 10) ?? 'no vence'}
                    {c.diasParaVencer !== null && c.diasParaVencer < 0 && ' · vencida'}
                  </td>
                  <td>
                    {c.enlace && (
                      <a className="btn-mini" href={c.enlace} target="_blank" rel="noreferrer">Ver</a>
                    )}
                    <button
                      className="btn-mini peligro"
                      type="button"
                      onClick={() =>
                        void api
                          .del(`/personal/credenciales/${c.id}`)
                          .then(() => { void cargarCreds(); alCambiar(); })
                          .catch((e: Error) => setError(e.message))
                      }
                    >
                      Quitar
                    </button>
                  </td>
                </tr>
              ))}
              {!creds.length && <tr><td colSpan={4} className="tenue">Sin credenciales cargadas.</td></tr>}
            </tbody>
          </table>

          <div className="rejilla-form" style={{ marginTop: 12 }}>
            <label>
              Documento
              <select value={nueva.kind} onChange={(e) => setNueva({ ...nueva, kind: e.target.value })}>
                {TIPOS.map((t) => <option key={t} value={t}>{legible(t)}</option>)}
              </select>
            </label>
            <label>Número<input value={nueva.number} onChange={(e) => setNueva({ ...nueva, number: e.target.value })} /></label>
            <label>
              Vence <span className="tenue">(vacío = no vence)</span>
              <input type="date" value={nueva.expiresAt} onChange={(e) => setNueva({ ...nueva, expiresAt: e.target.value })} />
            </label>
          </div>
          <div className="acciones" style={{ marginTop: 10 }}>
            <button
              className="btn-mini"
              type="button"
              onClick={() =>
                void api
                  .post('/personal/credenciales', {
                    professionalId: p.id,
                    kind: nueva.kind,
                    number: nueva.number || undefined,
                    expiresAt: nueva.expiresAt || undefined,
                  })
                  .then(() => {
                    setNueva({ kind: 'TARJETA_PROFESIONAL', number: '', expiresAt: '' });
                    void cargarCreds();
                    alCambiar();
                  })
                  .catch((e: Error) => setError(e.message))
              }
            >
              Agregar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
