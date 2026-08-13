'use client';

import { useEffect, useState } from 'react';

import { api } from '../../lib/api';

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

export default function Catalogo() {
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

  const sinCups = (servicios ?? []).filter((s) => !s.cupsCode).length;

  return (
    <>
      <span className="miga">Recursos</span>
      <h1>Catálogo y sedes</h1>
      <p className="sub">
        {servicios?.length ?? '—'} servicios activos en {sedes?.length ?? '—'} sedes.
      </p>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      {sedes && (
        <section style={{ marginTop: 30 }}>
          <h2 className="grupo-titulo">Sedes</h2>
          <table className="tabla">
            <thead>
              <tr>
                <th style={{ width: 120 }}>Código</th>
                <th>Sede</th>
                <th style={{ width: 140 }}>Ciudad</th>
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
                  <td className="tenue">{s.address}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {Object.entries(porLinea).map(([linea, lista]) => (
        <section key={linea} style={{ marginTop: 34 }}>
          <h2 className="grupo-titulo">
            {LINEA[linea] ?? linea} <span className="tenue">({lista.length})</span>
          </h2>
          <table className="tabla">
            <thead>
              <tr>
                <th style={{ width: 120 }}>Código</th>
                <th>Servicio</th>
                <th style={{ width: 100 }}>Duración</th>
                <th style={{ width: 180 }}>Equipo</th>
                <th style={{ width: 160 }}>Requisitos</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((s) => (
                <tr key={s.id}>
                  <td>
                    <span className="pill">{s.code}</span>
                  </td>
                  <td>{s.name}</td>
                  <td className="tenue">{s.durationMin} min</td>
                  <td className="tenue">{s.requiredModality ?? '—'}</td>
                  <td className="tenue" style={{ fontSize: '0.83rem' }}>
                    {[s.requiresAuthorization && 'autorización', s.requiresDilation && 'dilata']
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
          Las duraciones salen del sitio web, no de la clínica: son una conjetura del importador.
          Revíselas antes de agendar con pacientes reales — una duración inventada desordena la
          agenda de todo el día. Faltan además {sinCups} códigos CUPS, que la facturación
          electrónica exigirá.
        </p>
      )}
    </>
  );
}
