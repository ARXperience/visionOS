'use client';

import { useCallback, useEffect, useState } from 'react';

import { useSesion } from '../../components/marco';
import { api } from '../../lib/api';

interface Orden {
  id: string;
  status: string;
  laterality: string;
  indications: string | null;
  authorizationNumber: string | null;
  dueDate: string | null;
  createdAt: string;
  person: { id: string; displayName: string; phone: string | null };
  service: {
    name: string;
    businessLine: string;
    requiresAuthorization: boolean;
    preparationNotes: string | null;
  };
  orderedBy: { displayName: string } | null;
  scheduledAppointments: { id: string; publicCode: string; startsAt: string; status: string }[];
  results: { id: string; fileName: string; isFinal: boolean; performedAt: string }[];
}

interface Pendientes {
  porEstado: Record<string, number>;
  vencidas: number;
  realizadasSinInforme: number;
}

const ESTADO: Record<string, { texto: string; clase: string }> = {
  PENDIENTE: { texto: 'Falta autorización', clase: 'construccion' },
  AUTORIZADA: { texto: 'Por agendar', clase: 'planeado' },
  AGENDADA: { texto: 'Agendada', clase: 'disponible' },
  REALIZADA: { texto: 'Realizada, sin informe', clase: 'construccion' },
  INFORMADA: { texto: 'Informada', clase: 'disponible' },
  ANULADA: { texto: 'Anulada', clase: 'peligro' },
  VENCIDA: { texto: 'Vencida', clase: 'peligro' },
};

const OJO = { OD: 'ojo derecho', OI: 'ojo izquierdo', AO: 'ambos ojos', NA: '' };

const fecha = (iso: string) =>
  new Date(iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });

export default function Examenes() {
  const sesion = useSesion();
  const [ordenes, setOrdenes] = useState<Orden[] | null>(null);
  const [resumen, setResumen] = useState<Pendientes | null>(null);
  const [estado, setEstado] = useState('');
  const [soloVencidas, setSoloVencidas] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [subiendo, setSubiendo] = useState<Orden | null>(null);

  const cargar = useCallback(() => {
    const q = new URLSearchParams();
    if (estado) q.set('estado', estado);
    if (soloVencidas) q.set('vencidas', 'true');
    return Promise.all([
      api.get<Orden[]>(`/ordenes?${q}`).then(setOrdenes),
      api.get<Pendientes>('/ordenes/pendientes').then(setResumen),
    ]).catch((e: Error) => setError(e.message));
  }, [estado, soloVencidas]);

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
      await cargar();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <>
      <span className="miga">Pacientes</span>
      <h1>Exámenes diagnósticos</h1>
      <p className="sub">
        Orden → autorización → agenda → realización → resultado. La orden existe aunque nadie la
        agende, y ahí está su valor: esta lista es la de pacientes que se quedaron a medio camino.
      </p>

      {error && <p className="error" role="alert">{error}</p>}
      {aviso && <p className="ok" role="status">{aviso}</p>}

      {resumen && (
        <div className="cifras">
          <div className="cifra">
            <b>{resumen.porEstado.PENDIENTE ?? 0}</b>
            <span>Esperando autorización</span>
          </div>
          <div className="cifra">
            <b>{resumen.porEstado.AUTORIZADA ?? 0}</b>
            <span>Autorizadas sin agendar</span>
          </div>
          <div className={`cifra ${resumen.realizadasSinInforme > 0 ? 'ojo' : ''}`}>
            <b>{resumen.realizadasSinInforme}</b>
            <span>Hechas hace +3 días sin informe</span>
          </div>
          <div className={`cifra ${resumen.vencidas > 0 ? 'ojo' : ''}`}>
            <b>{resumen.vencidas}</b>
            <span>Órdenes vencidas</span>
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
          <input type="checkbox" checked={soloVencidas} onChange={(e) => setSoloVencidas(e.target.checked)} />
          Solo vencidas
        </label>
      </div>

      {subiendo && (
        <SubirResultado
          orden={subiendo}
          alCerrar={() => setSubiendo(null)}
          alSubir={() => {
            setSubiendo(null);
            setAviso('Resultado adjuntado.');
            void cargar();
          }}
        />
      )}

      <table className="tabla" style={{ marginTop: 18 }}>
        <thead>
          <tr>
            <th>Paciente</th>
            <th>Examen</th>
            <th style={{ width: 170 }}>Estado</th>
            <th style={{ width: 150 }}>Cita</th>
            <th style={{ width: 230 }} />
          </tr>
        </thead>
        <tbody>
          {ordenes?.map((o) => {
            const e = ESTADO[o.status] ?? { texto: o.status, clase: 'planeado' };
            const vencida = o.dueDate && new Date(o.dueDate) < new Date() && ['PENDIENTE', 'AUTORIZADA'].includes(o.status);
            return (
              <tr key={o.id}>
                <td>
                  <b>{o.person.displayName}</b>
                  <div className="tenue" style={{ fontSize: '0.78rem' }}>
                    {o.person.phone} · ordenada {fecha(o.createdAt)}
                  </div>
                </td>
                <td>
                  {o.service.name}
                  <div className="tenue" style={{ fontSize: '0.77rem' }}>
                    {OJO[o.laterality as keyof typeof OJO]}
                    {o.orderedBy && ` · ${o.orderedBy.displayName}`}
                  </div>
                  {o.service.preparationNotes && (
                    <div className="tenue" style={{ fontSize: '0.75rem' }}>
                      preparación: {o.service.preparationNotes.slice(0, 60)}
                    </div>
                  )}
                </td>
                <td>
                  <em className={`estado ${e.clase}`}>{e.texto}</em>
                  {vencida && (
                    <div className="tenue" style={{ fontSize: '0.74rem', color: 'var(--danger)' }}>
                      venció {fecha(o.dueDate!)}
                    </div>
                  )}
                  {o.authorizationNumber && (
                    <div className="tenue" style={{ fontSize: '0.74rem' }}>
                      aut. {o.authorizationNumber}
                    </div>
                  )}
                </td>
                <td className="tenue" style={{ fontSize: '0.8rem' }}>
                  {o.scheduledAppointments[0]
                    ? `${o.scheduledAppointments[0].publicCode} · ${fecha(o.scheduledAppointments[0].startsAt)}`
                    : '—'}
                </td>
                <td>
                  {puede && (
                    <div className="acciones">
                      {o.status === 'PENDIENTE' && (
                        <button
                          className="btn-mini"
                          type="button"
                          onClick={() => {
                            const n = prompt('Número de autorización de la EPS:');
                            if (n) void accion(() => api.post(`/ordenes/${o.id}/autorizar`, { numero: n }), 'Orden autorizada.');
                          }}
                        >
                          Autorizar
                        </button>
                      )}
                      {['AUTORIZADA', 'AGENDADA', 'REALIZADA'].includes(o.status) && (
                        <button className="btn-mini" type="button" onClick={() => setSubiendo(o)}>
                          Adjuntar resultado
                        </button>
                      )}
                      {o.results.length > 0 && (
                        <button
                          className="btn-mini"
                          type="button"
                          onClick={() =>
                            void api
                              .get<{ fileUrl: string; fileName: string; sha256: string }>(
                                `/ordenes/resultados/${o.results[0].id}`,
                              )
                              .then((r) => window.open(r.fileUrl, '_blank'))
                              .catch((x: Error) => setError(x.message))
                          }
                        >
                          Ver resultado{o.results[0].isFinal ? '' : ' (prelim.)'}
                        </button>
                      )}
                      {o.results.length === 0 && !['ANULADA'].includes(o.status) && (
                        <button
                          className="btn-mini peligro"
                          type="button"
                          onClick={() => {
                            const m = prompt('Motivo de la anulación:');
                            if (m) void accion(() => api.post(`/ordenes/${o.id}/anular`, { motivo: m }), 'Orden anulada.');
                          }}
                        >
                          Anular
                        </button>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
          {ordenes?.length === 0 && (
            <tr>
              <td colSpan={5} className="tenue">
                Sin órdenes con esos filtros.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <p className="aviso">
        El resultado se guarda como archivo con su <b>SHA-256</b>: es lo que permite demostrar que
        el informe que se descarga es el mismo que se subió. Ni el archivo ni su hash se pueden
        reescribir — solo marcar un preliminar como definitivo, o subir otra versión.
      </p>
    </>
  );
}

function SubirResultado({
  orden,
  alCerrar,
  alSubir,
}: {
  orden: Orden;
  alCerrar: () => void;
  alSubir: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [sha, setSha] = useState<string | null>(null);
  const [url, setUrl] = useState('');
  const [isFinal, setIsFinal] = useState(false);

  /**
   * El hash se calcula en el navegador con la API del propio navegador. Así
   * no hay que subir el archivo dos veces ni confiar en que el servidor lo
   * reciba íntegro para poder comprobarlo después.
   */
  async function elegir(f: File) {
    setArchivo(f);
    const buf = await f.arrayBuffer();
    const hash = await crypto.subtle.digest('SHA-256', buf);
    setSha(
      [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join(''),
    );
  }

  return (
    <div className="panel-agendar">
      <h2 style={{ fontSize: '1.05rem' }}>
        Resultado de {orden.service.name} — {orden.person.displayName}
      </h2>

      <p className="aviso" style={{ marginTop: 12 }}>
        <b>El archivo aún no se sube desde aquí.</b> Falta configurar el almacenamiento (Supabase
        Storage). Por ahora suba el PDF donde lo guarde la clínica y pegue el enlace: el sistema
        registra su hash, su tamaño y quién lo adjuntó, que es lo que permite auditarlo.
      </p>

      <div className="rejilla-form" style={{ marginTop: 14 }}>
        <label>
          Archivo (para calcular el hash)
          <input
            type="file"
            onChange={(e) => e.target.files?.[0] && void elegir(e.target.files[0])}
            style={{ fontWeight: 400 }}
          />
        </label>
        <label>
          Enlace al archivo
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" />
        </label>
      </div>

      {sha && (
        <p className="tenue" style={{ fontSize: '0.78rem', fontFamily: 'ui-monospace, monospace' }}>
          SHA-256: {sha}
        </p>
      )}

      <label className="interno" style={{ marginTop: 10 }}>
        <input type="checkbox" checked={isFinal} onChange={(e) => setIsFinal(e.target.checked)} />
        Es el informe definitivo (no un preliminar)
      </label>

      {error && <p className="error" role="alert">{error}</p>}

      <div className="acciones" style={{ marginTop: 16 }}>
        <button
          className="btn-mini"
          type="button"
          disabled={!archivo || !sha || !url}
          onClick={() =>
            void api
              .post(`/ordenes/${orden.id}/resultado`, {
                fileUrl: url,
                fileName: archivo!.name,
                mimeType: archivo!.type || 'application/octet-stream',
                sizeBytes: archivo!.size,
                sha256: sha,
                isFinal,
              })
              .then(alSubir)
              .catch((e: Error) => setError(e.message))
          }
        >
          Adjuntar
        </button>
        <button className="btn-mini" type="button" onClick={alCerrar}>
          Cancelar
        </button>
      </div>
    </div>
  );
}
