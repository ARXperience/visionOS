'use client';

import { useCallback, useEffect, useState } from 'react';

import { api } from '../../lib/api';

interface Prompt {
  id: string;
  slug: string;
  version: number;
  isActive: boolean;
  notes: string | null;
  createdAt: string;
}

interface Estado {
  habilitado: boolean;
  modo: string;
  criterioAutonomo: string;
  gastoMesUsd: number;
  presupuestoUsd: number;
  corridasMes: number;
  escaladosMes: number;
  herramientas: string[];
  prompts: Prompt[];
}

export default function Entrenamiento() {
  const [e, setE] = useState<Estado | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [texto, setTexto] = useState('');

  const cargar = useCallback(
    () => api.get<Estado>('/asistente/estado').then(setE).catch((x: Error) => setError(x.message)),
    [],
  );

  useEffect(() => {
    void cargar();
  }, [cargar]);

  return (
    <>
      <span className="miga">Inteligencia</span>
      <h1>Entrenamiento del asistente</h1>
      <p className="sub">
        El comportamiento se escribe aquí y se versiona. Una versión publicada nunca se edita: se
        publica otra. Volver atrás es un clic.
      </p>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      {e && !e.habilitado && (
        <p className="aviso">
          <b>Sin clave de proveedor configurada.</b> El asistente está construido y sus reglas de
          seguridad probadas, pero no ha respondido nunca a un paciente. Añada{' '}
          <code>OPENAI_API_KEY</code> al entorno para poder medirlo.
        </p>
      )}

      {e && (
        <>
          <div className="cifras">
            <div className="cifra">
              <b>{e.modo}</b>
              <span>Modo</span>
            </div>
            <div className="cifra">
              <b>{e.corridasMes}</b>
              <span>Respuestas este mes</span>
            </div>
            <div className="cifra">
              <b>{e.escaladosMes}</b>
              <span>Escaladas a un humano</span>
            </div>
            <div className={`cifra ${e.gastoMesUsd >= e.presupuestoUsd * 0.8 ? 'ojo' : ''}`}>
              <b>${e.gastoMesUsd.toFixed(2)}</b>
              <span>Gasto de ${e.presupuestoUsd} del mes</span>
            </div>
          </div>

          <p className="aviso">
            El paso a modo autónomo no se decide, se mide: {e.criterioAutonomo}. Por debajo de eso
            se itera el prompt, que por eso vive aquí y no en el código.
          </p>

          <h2 className="grupo-titulo" style={{ marginTop: 34 }}>
            Herramientas ({e.herramientas.length})
          </h2>
          <p className="tenue" style={{ fontSize: '0.88rem' }}>
            {e.herramientas.join(' · ')}
          </p>
          <p className="tenue" style={{ fontSize: '0.85rem', marginTop: 6 }}>
            Cancelar, cobrar, cambiar datos de la ficha y consultar historia clínica no están, a
            propósito: eso lo hace una persona.
          </p>

          <h2 className="grupo-titulo" style={{ marginTop: 34 }}>
            Versiones
          </h2>
          <table className="tabla">
            <thead>
              <tr>
                <th style={{ width: 130 }}>Propósito</th>
                <th style={{ width: 90 }}>Versión</th>
                <th>Nota</th>
                <th style={{ width: 110 }}>Estado</th>
                <th style={{ width: 120 }} />
              </tr>
            </thead>
            <tbody>
              {e.prompts.map((p) => (
                <tr key={p.id}>
                  <td>{p.slug}</td>
                  <td className="tenue">v{p.version}</td>
                  <td className="tenue">{p.notes ?? '—'}</td>
                  <td>
                    {p.isActive ? (
                      <em className="estado disponible">Activa</em>
                    ) : (
                      <em className="estado planeado">Inactiva</em>
                    )}
                  </td>
                  <td>
                    {!p.isActive && (
                      <button
                        className="btn-mini"
                        type="button"
                        onClick={() =>
                          void api.post('/asistente/prompts/activar', { id: p.id }).then(cargar)
                        }
                      >
                        Activar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <h2 className="grupo-titulo" style={{ marginTop: 34 }}>
            Publicar una versión nueva
          </h2>
          <textarea
            value={texto}
            onChange={(x) => setTexto(x.target.value)}
            rows={14}
            placeholder="Cómo debe hablar el asistente, qué no hace y cuándo escala a una persona…"
            className="prompt"
          />
          <button
            className="btn-mini"
            type="button"
            disabled={texto.trim().length < 50}
            onClick={() =>
              void api
                .post('/asistente/prompts', { slug: 'atencion', content: texto, activar: true })
                .then(() => {
                  setTexto('');
                  void cargar();
                })
                .catch((x: Error) => setError(x.message))
            }
          >
            Publicar y activar
          </button>
        </>
      )}
    </>
  );
}
