'use client';

import { useEffect, useState } from 'react';

import { type Sesion, api, salir } from '../lib/api';
import { Marca } from './marca';

interface Servicio {
  id: string;
  code: string;
  name: string;
  businessLine: string;
  durationMin: number;
  requiredModality: string | null;
  requiresAuthorization: boolean;
  requiresDilation: boolean;
  cupsCode: string | null;
}

interface Sede {
  id: string;
  code: string;
  name: string;
  city: string;
  address: string;
}

const LINEA: Record<string, string> = {
  CONSULTA: 'Consultas',
  EXAMEN: 'Exámenes diagnósticos',
  CIRUGIA: 'Cirugías',
  OPTICA: 'Óptica',
  EMPRESAS: 'Empresas',
  ESTETICA: 'Medicina estética',
};

export function Panel({ sesion, alSalir }: { sesion: Sesion; alSalir: () => void }) {
  const [servicios, setServicios] = useState<Servicio[] | null>(null);
  const [sedes, setSedes] = useState<Sede[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.get<Servicio[]>('/catalogo/servicios'), api.get<Sede[]>('/catalogo/sedes')])
      .then(([s, d]) => {
        setServicios(s);
        setSedes(d);
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  const porLinea = (servicios ?? []).reduce<Record<string, Servicio[]>>((acc, s) => {
    (acc[s.businessLine] ??= []).push(s);
    return acc;
  }, {});

  return (
    <>
      <header className="barra">
        <div className="wrap">
          <Marca claro />
          <div className="push">
            <span>
              {sesion.firstName} {sesion.lastName} · {sesion.role}
            </span>
            <button
              type="button"
              onClick={() => {
                void salir().then(alSalir);
              }}
            >
              Salir
            </button>
          </div>
        </div>
      </header>

      <main className="cuerpo">
        <div className="wrap">
          <h1 style={{ fontSize: '1.9rem' }}>Catálogo</h1>
          <p style={{ color: 'var(--mute)', marginTop: 8 }}>
            {servicios?.length ?? '—'} servicios activos en {sedes?.length ?? '—'} sedes.
          </p>

          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}

          {sedes && (
            <section style={{ marginTop: 34 }}>
              <h2 style={{ fontSize: '1.05rem', marginBottom: 14 }}>Sedes</h2>
              <table className="tabla">
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Sede</th>
                    <th>Ciudad</th>
                    <th>Dirección</th>
                  </tr>
                </thead>
                <tbody>
                  {sedes.map((s) => (
                    <tr key={s.id}>
                      <td>
                        <span className="pill">{s.code}</span>
                      </td>
                      <td>{s.name}</td>
                      <td>{s.city}</td>
                      <td style={{ color: 'var(--mute)' }}>{s.address}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {Object.entries(porLinea).map(([linea, lista]) => (
            <section key={linea} style={{ marginTop: 40 }}>
              <h2 style={{ fontSize: '1.05rem', marginBottom: 14 }}>
                {LINEA[linea] ?? linea}{' '}
                <span style={{ color: 'var(--mute)', fontWeight: 400 }}>({lista.length})</span>
              </h2>
              <table className="tabla">
                <thead>
                  <tr>
                    <th style={{ width: 110 }}>Código</th>
                    <th>Servicio</th>
                    <th style={{ width: 110 }}>Duración</th>
                    <th style={{ width: 190 }}>Equipo</th>
                    <th style={{ width: 150 }}>Requisitos</th>
                  </tr>
                </thead>
                <tbody>
                  {lista.map((s) => (
                    <tr key={s.id}>
                      <td>
                        <span className="pill">{s.code}</span>
                      </td>
                      <td>{s.name}</td>
                      <td style={{ color: 'var(--mute)' }}>{s.durationMin} min</td>
                      <td style={{ color: 'var(--mute)' }}>{s.requiredModality ?? '—'}</td>
                      <td style={{ color: 'var(--mute)', fontSize: '0.84rem' }}>
                        {[
                          s.requiresAuthorization && 'autorización',
                          s.requiresDilation && 'dilata',
                        ]
                          .filter(Boolean)
                          .join(' · ') || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ))}

          {servicios && (
            <p className="aviso">
              Las duraciones salen del sitio web, no de la clínica: son una conjetura del
              importador. Revíselas antes de agendar con pacientes reales — una duración
              inventada desordena la agenda de todo el día. Falta también el código CUPS de
              cada servicio, que la facturación electrónica exigirá.
            </p>
          )}
        </div>
      </main>
    </>
  );
}
