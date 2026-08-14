'use client';

import { useCallback, useEffect, useState } from 'react';

import { useSesion } from '../../components/marco';
import { api } from '../../lib/api';
import { ESTADOS, hora } from '../../lib/estados';

interface Sede {
  id: string;
  code: string;
  name: string;
}

interface Servicio {
  id: string;
  name: string;
  businessLine: string;
  durationMin: number;
}

interface Cita {
  id: string;
  publicCode: string;
  status: string;
  startsAt: string;
  endsAt: string;
  notes: string | null;
  person: { id: string; displayName: string; phone: string | null };
  service: { name: string; businessLine: string; requiresDilation: boolean };
  bookings: { professional: { displayName: string; color: string | null } | null }[];
}

interface Hueco {
  inicio: string;
  fin: string;
  professionalId: string;
  professionalName: string;
  roomId: string | null;
  equipmentId: string | null;
}

const hoyISO = () => new Date().toISOString().slice(0, 10);

export default function Agenda() {
  const sesion = useSesion();
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [sede, setSede] = useState('');
  const [fecha, setFecha] = useState(hoyISO());
  const [citas, setCitas] = useState<Cita[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [agendando, setAgendando] = useState(false);

  useEffect(() => {
    void api.get<Sede[]>('/catalogo/sedes').then((s) => {
      setSedes(s);
      setSede((actual) => actual || s[0]?.id || '');
    });
  }, []);

  const cargar = useCallback(() => {
    if (!sede) return Promise.resolve();
    return api
      .get<Cita[]>(`/agenda?siteId=${sede}&fecha=${fecha}`)
      .then(setCitas)
      .catch((e: Error) => setError(e.message));
  }, [sede, fecha]);

  useEffect(() => {
    void cargar();
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

  const puedeEscribir = sesion.permissions.includes('appointment.write');

  return (
    <>
      <span className="miga">Operación</span>
      <h1>Agenda</h1>
      <p className="sub">
        La base impide la doble reserva de profesional, consultorio y equipo. Si un cupo se ocupa
        mientras usted lo elige, el sistema lo rechaza en vez de sobrevender.
      </p>

      <div className="filtros">
        <select value={sede} onChange={(e) => setSede(e.target.value)}>
          {sedes.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
        {puedeEscribir && (
          <button className="btn-mini" type="button" onClick={() => setAgendando(true)}>
            Agendar cita
          </button>
        )}
      </div>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      {agendando && sede && (
        <Agendar
          siteId={sede}
          fecha={fecha}
          alCerrar={() => setAgendando(false)}
          alAgendar={() => {
            setAgendando(false);
            void cargar();
          }}
        />
      )}

      {citas?.length === 0 && <p className="aviso">No hay citas para este día en esta sede.</p>}

      {citas && citas.length > 0 && (
        <table className="tabla" style={{ marginTop: 22 }}>
          <thead>
            <tr>
              <th style={{ width: 110 }}>Hora</th>
              <th>Paciente</th>
              <th>Servicio</th>
              <th style={{ width: 190 }}>Profesional</th>
              <th style={{ width: 150 }}>Estado</th>
              <th style={{ width: 210 }} />
            </tr>
          </thead>
          <tbody>
            {citas.map((c) => {
              const e = ESTADOS[c.status] ?? { texto: c.status, clase: 'planeado' };
              return (
                <tr key={c.id}>
                  <td>
                    <b>{hora(c.startsAt)}</b>
                    <div className="tenue" style={{ fontSize: '0.76rem' }}>
                      {hora(c.endsAt)}
                    </div>
                  </td>
                  <td>
                    {c.person.displayName}
                    <div className="tenue" style={{ fontSize: '0.78rem' }}>
                      {c.person.phone} · {c.publicCode}
                    </div>
                  </td>
                  <td>
                    {c.service.name}
                    {c.service.requiresDilation && (
                      <div className="tenue" style={{ fontSize: '0.76rem' }}>
                        dilata — avisar que no conduzca
                      </div>
                    )}
                  </td>
                  <td className="tenue">{c.bookings[0]?.professional?.displayName ?? '—'}</td>
                  <td>
                    <em className={`estado ${e.clase}`}>{e.texto}</em>
                  </td>
                  <td>
                    {puedeEscribir && <Acciones estado={c.status} alCambiar={(s) => void cambiar(c.id, s)} />}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </>
  );
}

/**
 * Solo se ofrecen las transiciones que el servidor acepta. Mostrar botones
 * que van a devolver 409 enseña al personal a ignorar los errores.
 */
function Acciones({ estado, alCambiar }: { estado: string; alCambiar: (s: string) => void }) {
  const siguiente: Record<string, [string, string][]> = {
    PROGRAMADA: [['CONFIRMADA', 'Confirmar'], ['LLEGO', 'Llegó']],
    CONFIRMADA: [['LLEGO', 'Llegó']],
    LLEGO: [['EN_ESPERA', 'A sala']],
    EN_ADMISION: [['EN_ESPERA', 'A sala']],
    EN_ESPERA: [['EN_ATENCION', 'Pasa']],
    EN_ATENCION: [['FINALIZADA', 'Finalizar']],
    EN_PROCEDIMIENTO: [['FINALIZADA', 'Finalizar']],
    PARA_FACTURAR: [['FINALIZADA', 'Finalizar']],
  };

  const opciones = siguiente[estado] ?? [];
  const cancelable = !['FINALIZADA', 'CANCELADA', 'NO_ASISTIO'].includes(estado);

  return (
    <div className="acciones">
      {opciones.map(([s, texto]) => (
        <button key={s} type="button" className="btn-mini" onClick={() => alCambiar(s)}>
          {texto}
        </button>
      ))}
      {cancelable && (
        <button
          type="button"
          className="btn-mini peligro"
          onClick={() => alCambiar('CANCELADA')}
          title="Cancelar y liberar el cupo"
        >
          Cancelar
        </button>
      )}
    </div>
  );
}

function Agendar({
  siteId,
  fecha,
  alCerrar,
  alAgendar,
}: {
  siteId: string;
  fecha: string;
  alCerrar: () => void;
  alAgendar: () => void;
}) {
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [servicio, setServicio] = useState('');
  const [huecos, setHuecos] = useState<Hueco[] | null>(null);
  const [documento, setDocumento] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void api.get<Servicio[]>('/catalogo/servicios').then(setServicios);
  }, []);

  useEffect(() => {
    if (!servicio) return setHuecos(null);
    void api
      .get<Hueco[]>(`/agenda/disponibilidad?siteId=${siteId}&serviceId=${servicio}&fecha=${fecha}`)
      .then(setHuecos)
      .catch((e: Error) => setError(e.message));
  }, [servicio, siteId, fecha]);

  async function reservar(h: Hueco) {
    setError(null);
    try {
      const persona = await api.post<{ id: string }>('/pacientes/buscar-o-crear', {
        documento: documento.trim(),
      });
      await api.post('/agenda', {
        siteId,
        personId: persona.id,
        serviceId: servicio,
        professionalId: h.professionalId,
        roomId: h.roomId ?? undefined,
        equipmentId: h.equipmentId ?? undefined,
        startsAt: h.inicio,
      });
      alAgendar();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <div className="panel-agendar">
      <div className="fila-agendar">
        <select value={servicio} onChange={(e) => setServicio(e.target.value)}>
          <option value="">Elija el servicio…</option>
          {servicios.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} ({s.durationMin} min)
            </option>
          ))}
        </select>
        <input
          value={documento}
          onChange={(e) => setDocumento(e.target.value)}
          placeholder="Documento del paciente"
        />
        <button className="btn-mini" type="button" onClick={alCerrar}>
          Cerrar
        </button>
      </div>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      {huecos && huecos.length === 0 && (
        <p className="tenue" style={{ marginTop: 14 }}>
          No hay cupos ese día: ni festivo, ni horario del profesional, ni recurso libre.
        </p>
      )}

      {huecos && huecos.length > 0 && (
        <>
          <p className="tenue" style={{ margin: '14px 0 8px', fontSize: '0.85rem' }}>
            {huecos.length} cupos. Escriba el documento del paciente y elija uno.
          </p>
          <div className="huecos">
            {huecos.map((h) => (
              <button
                key={`${h.inicio}-${h.professionalId}`}
                type="button"
                className="hueco"
                disabled={!documento.trim()}
                onClick={() => void reservar(h)}
              >
                <b>{hora(h.inicio)}</b>
                <span>{h.professionalName}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
