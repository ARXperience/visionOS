'use client';

import { useEffect, useState } from 'react';

import { Icono } from '../../components/icono';
import { api } from '../../lib/api';
import { ESTADOS } from '../../lib/estados';

interface Resultado {
  id: string;
  displayName: string;
  docType: string | null;
  docNumber: string | null;
  phone: string | null;
  isPatient: boolean;
}

interface Evento {
  id: string;
  type: string;
  title: string;
  occurredAt: string;
  site: { code: string } | null;
  actor: { firstName: string; lastName: string } | null;
}

interface Ficha extends Resultado {
  birthDate: string | null;
  email: string | null;
  patientSince: string | null;
  mrn: string | null;
  tags: string[];
  coverages: {
    id: string;
    regime: string;
    planName: string | null;
    isPrimary: boolean;
    payer: { name: string; type: string };
  }[];
  appointments: {
    id: string;
    publicCode: string;
    status: string;
    startsAt: string;
    service: { name: string };
    site: { code: string };
  }[];
  conversations: { id: string; phoneNumber: string | null; lastMessageAt: string | null; lastMessageText: string | null }[];
  consents: { purpose: string; granted: boolean; grantedAt: string; revokedAt: string | null; policyVersion: string }[];
  recorrido: Evento[];
}

/** Un glifo por tipo de evento: el recorrido se lee de un vistazo. */
const GLIFO: Record<string, string> = {
  PRIMER_CONTACTO: 'chat',
  MENSAJE_ENTRANTE: 'chat',
  INTERES_DETECTADO: 'chispa',
  COTIZACION_ENVIADA: 'factura',
  LEAD_CREADO: 'embudo',
  CITA_CREADA: 'calendario',
  CITA_CONFIRMADA: 'calendario',
  CITA_CANCELADA: 'calendario',
  CHECKIN: 'puerta',
  ATENDIDO: 'diana',
  NO_ASISTIO: 'campana',
  CONSENTIMIENTO_OTORGADO: 'llave',
};

const cuando = (iso: string) =>
  new Date(iso).toLocaleString('es-CO', {
    timeZone: 'America/Bogota',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

export default function Pacientes() {
  const [q, setQ] = useState('');
  const [resultados, setResultados] = useState<Resultado[]>([]);
  const [ficha, setFicha] = useState<Ficha | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (q.trim().length < 3) return setResultados([]);
    // Espera a que deje de escribir: cada búsqueda queda auditada, y no
    // tiene sentido registrar una consulta por cada tecla.
    const t = setTimeout(() => {
      void api
        .get<Resultado[]>(`/pacientes/buscar?q=${encodeURIComponent(q.trim())}`)
        .then(setResultados)
        .catch((e: Error) => setError(e.message));
    }, 350);
    return () => clearTimeout(t);
  }, [q]);

  function abrir(id: string) {
    setError(null);
    void api
      .get<Ficha>(`/pacientes/${id}`)
      .then(setFicha)
      .catch((e: Error) => setError(e.message));
  }

  return (
    <>
      <span className="miga">Pacientes</span>
      <h1>Paciente 360°</h1>
      <p className="sub">
        Un solo perfil por persona, compartido entre las tres sedes. Cada consulta de una ficha
        queda registrada.
      </p>

      <div className="filtros">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Nombre, documento o teléfono…"
          style={{ minWidth: 340 }}
        />
      </div>

      {error && <p className="error" role="alert">{error}</p>}

      {resultados.length > 0 && !ficha && (
        <table className="tabla" style={{ marginTop: 18 }}>
          <tbody>
            {resultados.map((r) => (
              <tr key={r.id} onClick={() => abrir(r.id)} style={{ cursor: 'pointer' }}>
                <td>
                  <b>{r.displayName}</b>
                </td>
                <td className="tenue">{r.docNumber ? `${r.docType} ${r.docNumber}` : 'sin documento'}</td>
                <td className="tenue">{r.phone ?? '—'}</td>
                <td>
                  <span className={`pill ${r.isPatient ? '' : 'gris'}`}>
                    {r.isPatient ? 'paciente' : 'contacto'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {ficha && (
        <>
          <button className="btn-mini" type="button" onClick={() => setFicha(null)} style={{ marginTop: 18 }}>
            ← Volver a la búsqueda
          </button>

          <div className="ficha">
            <section className="ficha-datos">
              <h2>{ficha.displayName}</h2>
              <dl>
                <dt>Documento</dt>
                <dd>{ficha.docNumber ? `${ficha.docType} ${ficha.docNumber}` : '—'}</dd>
                <dt>Teléfono</dt>
                <dd>{ficha.phone ?? '—'}</dd>
                <dt>Correo</dt>
                <dd>{ficha.email ?? '—'}</dd>
                <dt>Historia</dt>
                <dd>{ficha.mrn ?? 'sin asignar'}</dd>
                <dt>Desde</dt>
                <dd>{ficha.patientSince ? cuando(ficha.patientSince) : 'aún no es paciente'}</dd>
              </dl>

              <h3 className="grupo-titulo" style={{ marginTop: 22 }}>Aseguradores</h3>
              {ficha.coverages.length === 0 ? (
                <p className="tenue">Sin afiliación registrada — se atiende como particular.</p>
              ) : (
                <ul className="lista-plana">
                  {ficha.coverages.map((c) => (
                    <li key={c.id}>
                      {c.payer.name} <span className="tenue">· {c.regime.toLowerCase()}</span>
                      {c.isPrimary && <span className="pill">principal</span>}
                    </li>
                  ))}
                </ul>
              )}

              <h3 className="grupo-titulo" style={{ marginTop: 22 }}>Autorizaciones de datos</h3>
              {ficha.consents.length === 0 ? (
                <p className="tenue">
                  Sin consentimiento registrado. La Ley 1581 exige autorización previa y expresa
                  para tratar datos de salud.
                </p>
              ) : (
                <ul className="lista-plana">
                  {ficha.consents.map((c, n) => (
                    <li key={n}>
                      {c.purpose.replace(/_/g, ' ').toLowerCase()}
                      <span className="tenue"> · {c.policyVersion}</span>
                      {c.revokedAt && <span className="pill gris">revocado</span>}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="ficha-recorrido">
              <h3 className="grupo-titulo">Recorrido</h3>
              {ficha.recorrido.length === 0 ? (
                <p className="tenue">Sin eventos todavía.</p>
              ) : (
                <ol className="linea">
                  {ficha.recorrido.map((e) => (
                    <li key={e.id}>
                      <span className="punto">
                        <Icono nombre={GLIFO[e.type] ?? 'lista'} tam={14} />
                      </span>
                      <div>
                        <b>{e.title}</b>
                        <span className="tenue">
                          {cuando(e.occurredAt)}
                          {e.site && ` · ${e.site.code}`}
                          {e.actor && ` · ${e.actor.firstName}`}
                        </span>
                      </div>
                    </li>
                  ))}
                </ol>
              )}

              <h3 className="grupo-titulo" style={{ marginTop: 28 }}>Citas</h3>
              {ficha.appointments.length === 0 ? (
                <p className="tenue">Sin citas.</p>
              ) : (
                <table className="tabla">
                  <tbody>
                    {ficha.appointments.map((a) => {
                      const e = ESTADOS[a.status] ?? { texto: a.status, clase: 'planeado' };
                      return (
                        <tr key={a.id}>
                          <td className="tenue">{cuando(a.startsAt)}</td>
                          <td>{a.service.name}</td>
                          <td className="tenue">{a.site.code}</td>
                          <td>
                            <em className={`estado ${e.clase}`}>{e.texto}</em>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </section>
          </div>
        </>
      )}
    </>
  );
}
