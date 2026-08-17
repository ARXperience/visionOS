'use client';

import { useState } from 'react';

/**
 * Portal del paciente. Sin login, a propósito.
 *
 * Se llega desde el enlace del recordatorio de WhatsApp. Dos datos que solo
 * tiene quien recibió el mensaje: el código de la cita y los últimos cuatro
 * del documento. Nadie va a recordar otra contraseña para ver la hora de una
 * cita, y una base de credenciales de pacientes es una superficie de ataque
 * nueva a cambio de nada.
 */

interface Cita {
  codigo: string;
  paciente: string;
  cuando: string;
  estado: string;
  servicio: string;
  ojo: string | null;
  preparacion: string | null;
  requiereDilatacion: boolean;
  sede: { nombre: string; direccion: string; telefono: string | null };
  puedeConfirmar: boolean;
  puedeCancelar: boolean;
}

const BASE = process.env.NEXT_PUBLIC_API_URL ?? '/api';

async function llamar<T>(ruta: string, cuerpo: unknown): Promise<T> {
  const r = await fetch(`${BASE}${ruta}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(cuerpo),
  });
  const datos = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(datos.message ?? 'No pudimos completar la consulta.');
  return datos as T;
}

const cuando = (s: string) =>
  new Date(s).toLocaleString('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });

export default function MiCita() {
  const [codigo, setCodigo] = useState('');
  const [ultimos4, setUltimos4] = useState('');
  const [cita, setCita] = useState<Cita | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function consultar() {
    setCargando(true);
    setError(null);
    setAviso(null);
    try {
      setCita(await llamar<Cita>('/portal/consultar', { codigo, ultimos4 }));
    } catch (e) {
      setCita(null);
      setError((e as Error).message);
    } finally {
      setCargando(false);
    }
  }

  async function responder(accion: 'confirmar' | 'cancelar') {
    setCargando(true);
    setError(null);
    try {
      const r = await llamar<{ mensaje: string }>('/portal/responder', { codigo, ultimos4, accion });
      setAviso(r.mensaje);
      setCita(await llamar<Cita>('/portal/consultar', { codigo, ultimos4 }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setCargando(false);
    }
  }

  return (
    <main style={{ maxWidth: 560, margin: '0 auto', padding: '48px 20px' }}>
      <h1 style={{ fontSize: '1.5rem', marginBottom: 4 }}>Su cita en Visión Colombia</h1>
      <p className="tenue" style={{ marginTop: 0 }}>
        Consulte, confirme o cancele. Para cambiar la hora, escríbanos por WhatsApp.
      </p>

      <div className="panel-agendar" style={{ marginTop: 20 }}>
        <div className="rejilla-form">
          <label>
            Código de la cita
            <input
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.toUpperCase())}
              placeholder="VC-4F7K2"
              autoComplete="off"
            />
          </label>
          <label>
            Últimos 4 dígitos de su documento
            <input
              value={ultimos4}
              onChange={(e) => setUltimos4(e.target.value.replace(/\D/g, '').slice(0, 4))}
              inputMode="numeric"
              placeholder="1234"
              autoComplete="off"
            />
          </label>
        </div>
        <div className="acciones" style={{ marginTop: 12 }}>
          <button
            className="btn-mini"
            type="button"
            disabled={codigo.length < 5 || ultimos4.length !== 4 || cargando}
            onClick={() => void consultar()}
          >
            {cargando ? 'Consultando…' : 'Ver mi cita'}
          </button>
        </div>
      </div>

      {error && <p className="error" role="alert">{error}</p>}
      {aviso && <p className="aviso" role="status">{aviso}</p>}

      {cita && (
        <div className="panel-agendar" style={{ marginTop: 18 }}>
          <p className="tenue" style={{ margin: 0 }}>Hola, {cita.paciente}.</p>
          <h2 style={{ fontSize: '1.15rem', margin: '6px 0' }}>{cita.servicio}</h2>
          <p style={{ fontSize: '1.05rem', margin: '0 0 4px', textTransform: 'capitalize' }}>
            <b>{cuando(cita.cuando)}</b>
          </p>
          {cita.ojo && <p className="tenue" style={{ margin: 0 }}>Ojo {cita.ojo === 'OD' ? 'derecho' : 'izquierdo'}</p>}

          <p style={{ marginTop: 12, marginBottom: 0 }}>{cita.sede.nombre}</p>
          <p className="tenue" style={{ margin: 0 }}>{cita.sede.direccion}</p>
          {cita.sede.telefono && <p className="tenue" style={{ margin: 0 }}>{cita.sede.telefono}</p>}

          {cita.requiereDilatacion && (
            <div className="aviso" style={{ marginTop: 14 }}>
              <b>Le van a dilatar las pupilas.</b> Venga acompañado y no maneje al salir: la visión
              queda borrosa varias horas.
            </div>
          )}
          {cita.preparacion && (
            <div className="aviso" style={{ marginTop: 10 }}>
              <b>Preparación:</b> {cita.preparacion}
            </div>
          )}

          <p className="tenue" style={{ marginTop: 14, fontSize: '0.85rem' }}>
            Estado: {cita.estado.replace(/_/g, ' ').toLowerCase()}
          </p>

          <div className="acciones" style={{ marginTop: 12 }}>
            {cita.puedeConfirmar && (
              <button className="btn-mini" type="button" disabled={cargando} onClick={() => void responder('confirmar')}>
                Confirmar que asistiré
              </button>
            )}
            {cita.puedeCancelar && (
              <button
                className="btn-mini peligro"
                type="button"
                disabled={cargando}
                onClick={() => {
                  if (!window.confirm('¿Seguro que quiere cancelar esta cita?')) return;
                  void responder('cancelar');
                }}
              >
                No podré asistir
              </button>
            )}
          </div>

          {/* Reagendar exige ver disponibilidad real y eso sí es una
              aplicación con sesión. Para eso está WhatsApp, donde hay alguien
              —o el asistente— para atender. */}
          <p className="tenue" style={{ marginTop: 14, fontSize: '0.82rem' }}>
            ¿Necesita otra hora? Escríbanos por WhatsApp y le buscamos un cupo.
          </p>
        </div>
      )}
    </main>
  );
}
