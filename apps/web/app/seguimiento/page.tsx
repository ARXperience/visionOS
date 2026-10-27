'use client';

import { useCallback, useEffect, useState } from 'react';

import { Icono } from '../../components/icono';
import { api } from '../../lib/api';

interface Espera {
  id: string;
  priority: number;
  preferredFrom: string | null;
  preferredTo: string | null;
  notifiedAt: string | null;
  notes: string | null;
  diasEsperando: number;
  person: { id: string; displayName: string; phone: string | null };
  service: { id: string; name: string };
  site: { code: string };
}

interface Control {
  personId: string;
  paciente: string;
  telefono: string | null;
  ultimaAtencion: string;
  mesesSinVolver: number;
  servicio: string;
  linea: string;
  sede: string;
}

interface Resumen {
  enEspera: number;
  ofrecidosSinRespuesta: number;
  controlesPendientes: number;
}

export default function Seguimiento() {
  const [vista, setVista] = useState<'espera' | 'controles'>('espera');
  const [espera, setEspera] = useState<Espera[]>([]);
  const [controles, setControles] = useState<Control[]>([]);
  const [meses, setMeses] = useState(12);
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    try {
      const [e, c, r] = await Promise.all([
        api.get<Espera[]>('/seguimiento/espera'),
        api.get<Control[]>(`/seguimiento/controles?meses=${meses}`),
        api.get<Resumen>('/seguimiento/resumen'),
      ]);
      setEspera(e);
      setControles(c);
      setResumen(r);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [meses]);

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
      <span className="miga">Operación</span>
      <h1>Seguimiento</h1>
      <p className="sub" style={{ maxWidth: 760 }}>
        Los recordatorios de cita corren solos y su salud se ve en Automatizaciones. Aquí está lo
        que ningún automatismo resuelve: quién espera un cupo y quién se quedó a mitad de camino.
      </p>

      {error && <p className="error" role="alert">{error}</p>}

      {resumen && (
        <div className="seguimiento-resumen" aria-label="Resumen de seguimiento">
          <IndicadorSeguimiento
            icono="calendario"
            valor={resumen.enEspera}
            etiqueta="En lista de espera"
            detalle="Pacientes esperando un cupo disponible"
            contexto="Ordenados por prioridad y antigüedad"
          />
          <IndicadorSeguimiento
            icono="chat"
            valor={resumen.ofrecidosSinRespuesta}
            etiqueta="Cupo ofrecido"
            detalle="Aún sin confirmación del paciente"
            contexto="Requieren una llamada o mensaje"
            tono="atencion"
          />
          <IndicadorSeguimiento
            icono="campana"
            valor={resumen.controlesPendientes}
            etiqueta="No volvieron"
            detalle="Sin una cita futura programada"
            contexto="Oportunidad de recuperar el control"
            tono={resumen.controlesPendientes > 0 ? 'prioridad' : 'neutro'}
          />
        </div>
      )}

      <div className="acciones" style={{ marginTop: 20 }}>
        <button className={`btn-mini${vista === 'espera' ? '' : ' tenue'}`} type="button" onClick={() => setVista('espera')}>
          Lista de espera
        </button>
        <button className={`btn-mini${vista === 'controles' ? '' : ' tenue'}`} type="button" onClick={() => setVista('controles')}>
          Controles pendientes
        </button>
      </div>

      {vista === 'espera' && (
        <>
          <p className="tenue" style={{ marginTop: 12, fontSize: '0.82rem' }}>
            En el orden en que hay que llamar: primero la prioridad, luego quien lleva más tiempo
            esperando. El orden lo da el índice de la base, no un criterio que alguien pueda cambiar
            sin darse cuenta.
          </p>
          <table className="tabla">
            <thead>
              <tr><th>Paciente</th><th>Servicio</th><th>Sede</th><th>Esperando</th><th>Estado</th><th /></tr>
            </thead>
            <tbody>
              {espera.map((e) => (
                <tr key={e.id}>
                  <td>
                    <b>{e.person.displayName}</b>
                    <div className="tenue" style={{ fontSize: '0.76rem' }}>{e.person.phone ?? 'sin teléfono'}</div>
                  </td>
                  <td>{e.service.name}</td>
                  <td className="tenue">{e.site.code}</td>
                  <td>{e.diasEsperando} d</td>
                  <td className="tenue">
                    {e.priority >= 100 && <span className="etiqueta" style={{ borderColor: '#B4261A' }}>prioritario</span>}
                    {e.notifiedAt ? ' ofrecido' : ' en cola'}
                  </td>
                  <td>
                    {!e.notifiedAt && (
                      <button className="btn-mini" type="button" onClick={() => void accion(() => api.post(`/seguimiento/espera/${e.id}/ofrecido`, {}))}>
                        Le ofrecí cupo
                      </button>
                    )}
                    <button
                      className="btn-mini peligro"
                      type="button"
                      onClick={() => {
                        // Baja lógica: la lista de espera es la prueba de
                        // cuánta demanda no se pudo atender.
                        const motivo = window.prompt('Motivo para retirarlo de la lista:') || undefined;
                        void accion(() => api.post(`/seguimiento/espera/${e.id}/retirar`, { motivo }));
                      }}
                    >
                      Retirar
                    </button>
                  </td>
                </tr>
              ))}
              {!espera.length && <tr><td colSpan={6} className="tenue">Nadie esperando cupo.</td></tr>}
            </tbody>
          </table>
        </>
      )}

      {vista === 'controles' && (
        <>
          <p className="tenue" style={{ marginTop: 12, fontSize: '0.82rem' }}>
            Pacientes atendidos hace más de{' '}
            <select value={meses} onChange={(e) => setMeses(Number(e.target.value))} style={{ display: 'inline-block', width: 'auto' }}>
              {[3, 6, 12, 18, 24].map((m) => <option key={m} value={m}>{m} meses</option>)}
            </select>{' '}
            que no tienen ninguna cita futura. No es una tabla: se deriva, para que no haya que
            mantener un &ldquo;debe volver el…&rdquo; sincronizado en cada reagenda.
          </p>
          <table className="tabla">
            <thead>
              <tr><th>Paciente</th><th>Última atención</th><th>Sin volver</th><th>Fue por</th><th>Sede</th></tr>
            </thead>
            <tbody>
              {controles.map((c) => (
                <tr key={c.personId}>
                  <td>
                    <b>{c.paciente}</b>
                    <div className="tenue" style={{ fontSize: '0.76rem' }}>{c.telefono ?? 'sin teléfono'}</div>
                  </td>
                  <td className="tenue">{c.ultimaAtencion}</td>
                  <td style={c.mesesSinVolver >= 24 ? { color: '#B4261A' } : undefined}>{c.mesesSinVolver} meses</td>
                  <td className="tenue">{c.servicio}</td>
                  <td className="tenue">{c.sede}</td>
                </tr>
              ))}
              {!controles.length && (
                <tr><td colSpan={5} className="tenue">Nadie pendiente de volver con ese corte.</td></tr>
              )}
            </tbody>
          </table>
        </>
      )}
    </>
  );
}

function IndicadorSeguimiento({
  icono,
  valor,
  etiqueta,
  detalle,
  contexto,
  tono = 'neutro',
}: {
  icono: string;
  valor: number;
  etiqueta: string;
  detalle: string;
  contexto: string;
  tono?: 'neutro' | 'atencion' | 'prioridad';
}) {
  return (
    <article className={`indicador-seguimiento ${tono}`}>
      <div className="indicador-cabecera">
        <span className="indicador-icono" aria-hidden="true"><Icono nombre={icono} tam={20} /></span>
        <span className="indicador-estado">
          <span aria-hidden="true" /> En seguimiento
        </span>
      </div>
      <div className="indicador-valor">
        <strong>{valor}</strong>
        <span>{etiqueta}</span>
      </div>
      <p>{detalle}</p>
      <footer>{contexto}<span aria-hidden="true">↗</span></footer>
    </article>
  );
}
