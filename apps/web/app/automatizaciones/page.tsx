'use client';

import { useEffect, useState } from 'react';

import { api } from '../../lib/api';

interface Regla {
  id: string;
  nombre: string;
  descripcion: string;
  frecuencia: string;
  activa: boolean;
  comprobacion: string;
}

interface Estado {
  reglas: Regla[];
  salud: { enCola: number; atrasoMinutos: number; fallidosUltimos7Dias: number };
}

interface Envio {
  id: string;
  kind: string;
  scheduledFor: string;
  sentAt: string | null;
  outcome: string;
  error: string | null;
  appointment: {
    publicCode: string;
    startsAt: string;
    person: { displayName: string; phone: string | null };
  };
}

const hora = (s: string | null) =>
  s ? new Date(s).toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';

export default function Automatizaciones() {
  const [estado, setEstado] = useState<Estado | null>(null);
  const [envios, setEnvios] = useState<Envio[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void Promise.all([api.get<Estado>('/automatizaciones'), api.get<Envio[]>('/automatizaciones/envios?limite=40')])
      .then(([e, s]) => {
        setEstado(e);
        setEnvios(s);
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  return (
    <>
      <span className="miga">Dirección</span>
      <h1>Automatizaciones</h1>
      <p className="sub" style={{ maxWidth: 760 }}>
        Aquí no hay un constructor de reglas, y es una decisión. Un &ldquo;si pasa X entonces Y&rdquo;
        configurable es un lenguaje de programación con interfaz gráfica: hay que mantenerlo,
        versionarlo y depurar por qué la regla que alguien armó un martes le mandó cuatro mensajes
        al mismo paciente. Reglas en código hasta que existan diez reales; hoy hay cuatro.
        <br />
        Lo que sí hacía falta es esta pantalla: una automatización invisible es una que nadie apaga
        cuando empieza a hacer daño.
      </p>

      {error && <p className="error" role="alert">{error}</p>}

      {estado && (
        <>
          {estado.salud.atrasoMinutos > 60 && (
            <div className="aviso" style={{ marginTop: 14, borderColor: '#B4261A' }}>
              <b>Hay envíos atrasados {estado.salud.atrasoMinutos} minutos.</b> El planificador no
              está corriendo: revise que el proceso del API esté vivo.
            </div>
          )}

          <div className="tarjetas" style={{ marginTop: 16 }}>
            <div className="tarjeta">
              <strong style={{ fontSize: '1.6rem' }}>{estado.salud.enCola}</strong>
              <span className="tenue">En cola</span>
            </div>
            <div
              className="tarjeta"
              style={estado.salud.atrasoMinutos > 60 ? { borderColor: '#B4261A' } : undefined}
            >
              <strong style={{ fontSize: '1.6rem' }}>{estado.salud.atrasoMinutos} min</strong>
              <span className="tenue">Atraso del planificador</span>
            </div>
            <div
              className="tarjeta"
              style={estado.salud.fallidosUltimos7Dias > 0 ? { borderColor: '#B4261A' } : undefined}
            >
              <strong style={{ fontSize: '1.6rem' }}>{estado.salud.fallidosUltimos7Dias}</strong>
              <span className="tenue">Fallidos en 7 días</span>
            </div>
          </div>

          <div style={{ marginTop: 22, display: 'grid', gap: 10 }}>
            {estado.reglas.map((r) => (
              <div key={r.id} className="fila-lista" style={{ padding: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                  <div>
                    <strong>{r.nombre}</strong>
                    <p className="tenue" style={{ fontSize: '0.84rem', margin: '4px 0' }}>
                      {r.descripcion}
                    </p>
                    <span className="tenue" style={{ fontSize: '0.78rem' }}>{r.frecuencia}</span>
                  </div>
                  <div style={{ textAlign: 'right', minWidth: 170 }}>
                    <span className="etiqueta" style={{ borderColor: r.activa ? '#0E93B4' : undefined, opacity: r.activa ? 1 : 0.5 }}>
                      {r.activa ? 'activa' : 'apagada'}
                    </span>
                    {/* "Activa" no significa que funcione: por eso cada regla
                        trae cómo comprobar que de verdad corrió. */}
                    <div className="tenue" style={{ fontSize: '0.78rem', marginTop: 6 }}>{r.comprobacion}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <h2 style={{ fontSize: '1rem', marginTop: 28 }}>Últimos envíos</h2>
      <table className="tabla">
        <thead>
          <tr><th>Paciente</th><th>Tipo</th><th>Programado</th><th>Enviado</th><th>Resultado</th></tr>
        </thead>
        <tbody>
          {envios.map((e) => (
            <tr key={e.id}>
              <td>
                {e.appointment.person.displayName}
                <div className="tenue" style={{ fontSize: '0.76rem' }}>{e.appointment.publicCode}</div>
              </td>
              <td className="tenue">{e.kind.replace(/_/g, ' ').toLowerCase()}</td>
              <td className="tenue">{hora(e.scheduledFor)}</td>
              <td className="tenue">{hora(e.sentAt)}</td>
              <td style={e.outcome === 'FALLIDO' ? { color: '#B4261A' } : undefined}>
                {e.outcome.toLowerCase()}
                {e.error && <div className="tenue" style={{ fontSize: '0.74rem' }}>{e.error}</div>}
              </td>
            </tr>
          ))}
          {!envios.length && (
            <tr><td colSpan={5} className="tenue">Todavía no ha salido ningún recordatorio.</td></tr>
          )}
        </tbody>
      </table>
    </>
  );
}
