'use client';

import { useCallback, useEffect, useState } from 'react';

import { useSesion } from '../../components/marco';
import { api } from '../../lib/api';
import { ESTADOS, hora } from '../../lib/estados';

interface Cita {
  id: string;
  publicCode: string;
  status: string;
  startsAt: string;
  person: { displayName: string; phone: string | null };
  service: { name: string; requiresDilation: boolean };
  bookings: { professional: { displayName: string } | null }[];
}

/** Recepción mira esta pantalla todo el día: se refresca sola. */
const CADA_MS = 15_000;

/** Solo lo que está vivo hoy. Una cita finalizada ya no ocupa la sala. */
const EN_CURSO = ['PROGRAMADA', 'CONFIRMADA', 'LLEGO', 'EN_ADMISION', 'EN_ESPERA', 'EN_ATENCION'];

export default function Recepcion() {
  const sesion = useSesion();
  const [sedes, setSedes] = useState<{ id: string; name: string }[]>([]);
  const [sede, setSede] = useState('');
  const [citas, setCitas] = useState<Cita[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void api.get<{ id: string; name: string }[]>('/catalogo/sedes').then((s) => {
      setSedes(s);
      setSede((a) => a || s[0]?.id || '');
    });
  }, []);

  const cargar = useCallback(() => {
    if (!sede) return Promise.resolve();
    const hoy = new Date().toISOString().slice(0, 10);
    return api
      .get<Cita[]>(`/agenda?siteId=${sede}&fecha=${hoy}`)
      .then(setCitas)
      .catch((e: Error) => setError(e.message));
  }, [sede]);

  useEffect(() => {
    void cargar();
    const t = setInterval(() => void cargar(), CADA_MS);
    return () => clearInterval(t);
  }, [cargar]);

  async function cambiar(id: string, estado: string) {
    setError(null);
    try {
      await api.post(`/agenda/${id}/estado`, { estado });
      await cargar();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const vivas = (citas ?? []).filter((c) => EN_CURSO.includes(c.status));
  const porEstado = (e: string[]) => vivas.filter((c) => e.includes(c.status));
  const puede = sesion.permissions.includes('appointment.checkin');

  const columnas: [string, string[], string][] = [
    ['Por llegar', ['PROGRAMADA', 'CONFIRMADA'], 'LLEGO'],
    ['Llegaron', ['LLEGO', 'EN_ADMISION'], 'EN_ESPERA'],
    ['En sala de espera', ['EN_ESPERA'], 'EN_ATENCION'],
    ['En atención', ['EN_ATENCION'], 'FINALIZADA'],
  ];

  return (
    <>
      <span className="miga">Operación</span>
      <h1>Recepción</h1>
      <p className="sub">
        El día de hoy, en tiempo real. Se actualiza solo cada {CADA_MS / 1000} segundos.
      </p>

      <div className="filtros">
        <select value={sede} onChange={(e) => setSede(e.target.value)}>
          {sedes.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="error" role="alert">{error}</p>}

      <div className="tablero">
        {columnas.map(([titulo, estados, siguiente]) => {
          const lista = porEstado(estados);
          return (
            <section key={titulo} className="columna">
              <h2>
                {titulo} <span className="tenue">({lista.length})</span>
              </h2>
              {lista.length === 0 && <p className="vacia">—</p>}
              {lista.map((c) => (
                <article key={c.id} className="tarjeta-cita">
                  <b>{hora(c.startsAt)}</b>
                  <span className="nombre">{c.person.displayName}</span>
                  <span className="tenue">{c.service.name}</span>
                  {c.service.requiresDilation && (
                    <span className="dilata">Dilata — que venga acompañado</span>
                  )}
                  <span className="tenue" style={{ fontSize: '0.74rem' }}>
                    {c.bookings[0]?.professional?.displayName ?? '—'} · {c.publicCode}
                  </span>
                  {puede && (
                    <div className="acciones">
                      <button className="btn-mini" type="button" onClick={() => void cambiar(c.id, siguiente)}>
                        {ESTADOS[siguiente]?.texto ?? siguiente}
                      </button>
                      {estados.includes('PROGRAMADA') && (
                        <button
                          className="btn-mini peligro"
                          type="button"
                          onClick={() => void cambiar(c.id, 'NO_ASISTIO')}
                        >
                          No asistió
                        </button>
                      )}
                    </div>
                  )}
                </article>
              ))}
            </section>
          );
        })}
      </div>
    </>
  );
}
