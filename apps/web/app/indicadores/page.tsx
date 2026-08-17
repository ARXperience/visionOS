'use client';

import { useCallback, useEffect, useState } from 'react';

import { api } from '../../lib/api';

interface Indicadores {
  periodo: { desde: string; hasta: string };
  agenda: {
    programadas: number;
    atendidas: number;
    noShow: number;
    canceladas: number;
    tasaNoShow: number | null;
    oportunidadDias: number | null;
    esperaEnSalaMin: number | null;
  };
  clinico: { ordenesGeneradas: number; cirugias: number; conComplicacion: number; conPausaRegistrada: number | null };
  dinero: { facturado: string; recaudado: string; porRecaudar: string; tasaRecaudo: number | null };
  experiencia: {
    pqrsf: number;
    quejasYReclamos: number;
    felicitaciones: number;
    cumplimientoPlazo: number | null;
    satisfaccionMedia: number | null;
  };
  optica: { ordenes: number; entregadas: number; entregaATiempo: number | null };
  canal: { conversacionesNuevas: number };
}

interface Mes {
  mes: string;
  citas: number;
  noShow: number | null;
  oportunidad: number | null;
  facturado: string;
  recaudo: number | null;
  pqrsf: number;
}

const pesos = (v: string) =>
  Number(v).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

const n = (v: number | null, sufijo = '') => (v === null ? '—' : `${v}${sufijo}`);

export default function Indicadores() {
  const [ind, setInd] = useState<Indicadores | null>(null);
  const [tendencia, setTendencia] = useState<Mes[]>([]);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    try {
      const [i, t] = await Promise.all([
        api.get<Indicadores>('/indicadores'),
        api.get<Mes[]>('/indicadores/tendencia?meses=6'),
      ]);
      setInd(i);
      setTendencia(t);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  return (
    <>
      <span className="miga">Dirección</span>
      <h1>Indicadores</h1>
      <p className="sub" style={{ maxWidth: 720 }}>
        La docena de números que hay que mirar cada mes. No es una herramienta de reportes: para
        cruzar datos a mano va Metabase contra la misma base, sin escribir código. Esto son los
        indicadores que exigen conocer las reglas —qué cuenta como oportunidad, cuándo un no-show es
        no-show— y que por eso nadie va a armar arrastrando columnas.
      </p>

      {error && <p className="error" role="alert">{error}</p>}
      {!ind && !error && <p className="tenue">Cargando…</p>}

      {ind && (
        <>
          <p className="tenue" style={{ marginTop: 10, fontSize: '0.82rem' }}>
            Del {ind.periodo.desde} al {ind.periodo.hasta}.
          </p>

          <Bloque titulo="Agenda">
            <Dato v={ind.agenda.programadas} r="Programadas" />
            <Dato v={ind.agenda.atendidas} r="Atendidas" />
            <Dato
              v={n(ind.agenda.tasaNoShow, '%')}
              r="No asistieron"
              alerta={(ind.agenda.tasaNoShow ?? 0) > 15}
              nota="Sobre las citas que llegaron a su fecha, no sobre todas: contar las canceladas con semanas de antelación infla el número."
            />
            <Dato
              v={n(ind.agenda.oportunidadDias, ' días')}
              r="Oportunidad"
              nota="Días entre que el paciente pidió la cita y el día en que se la dieron. Es el indicador que mira la Supersalud."
            />
            <Dato v={n(ind.agenda.esperaEnSalaMin, ' min')} r="Espera en sala" />
          </Bloque>

          <Bloque titulo="Clínico">
            <Dato v={ind.clinico.cirugias} r="Cirugías" />
            <Dato v={ind.clinico.conComplicacion} r="Con complicación" alerta={ind.clinico.conComplicacion > 0} />
            <Dato
              v={n(ind.clinico.conPausaRegistrada, '%')}
              r="Con pausa quirúrgica"
              alerta={ind.clinico.conPausaRegistrada !== null && ind.clinico.conPausaRegistrada < 100}
              nota="Si no es 100%, hubo cirugías sin pausa registrada. Eso es un hallazgo, no una estadística."
            />
            <Dato v={ind.clinico.ordenesGeneradas} r="Órdenes de examen" />
          </Bloque>

          <Bloque titulo="Dinero">
            <Dato v={pesos(ind.dinero.facturado)} r="Facturado" />
            <Dato v={pesos(ind.dinero.recaudado)} r="Recaudado" />
            <Dato v={pesos(ind.dinero.porRecaudar)} r="Por recaudar" alerta={Number(ind.dinero.porRecaudar) > 0} />
            <Dato v={n(ind.dinero.tasaRecaudo, '%')} r="Tasa de recaudo" />
          </Bloque>

          <Bloque titulo="Experiencia y óptica">
            <Dato v={ind.experiencia.quejasYReclamos} r="Quejas y reclamos" />
            <Dato v={ind.experiencia.felicitaciones} r="Felicitaciones" />
            <Dato
              v={n(ind.experiencia.cumplimientoPlazo, '%')}
              r="PQRSF en plazo"
              alerta={ind.experiencia.cumplimientoPlazo !== null && ind.experiencia.cumplimientoPlazo < 100}
            />
            <Dato v={n(ind.experiencia.satisfaccionMedia, ' / 5')} r="Satisfacción" />
            <Dato v={n(ind.optica.entregaATiempo, '%')} r="Óptica a tiempo" />
            <Dato v={ind.canal.conversacionesNuevas} r="Conversaciones nuevas" />
          </Bloque>

          <h2 style={{ fontSize: '1rem', marginTop: 28 }}>Últimos seis meses</h2>
          <p className="tenue" style={{ fontSize: '0.82rem' }}>
            Una foto no dice si algo mejora.
          </p>
          <table className="tabla">
            <thead>
              <tr>
                <th>Mes</th>
                <th>Citas</th>
                <th>No-show</th>
                <th>Oportunidad</th>
                <th>Facturado</th>
                <th>Recaudo</th>
                <th>PQRSF</th>
              </tr>
            </thead>
            <tbody>
              {tendencia.map((m) => (
                <tr key={m.mes}>
                  <td><b>{m.mes}</b></td>
                  <td>{m.citas}</td>
                  <td>{n(m.noShow, '%')}</td>
                  <td>{n(m.oportunidad, ' d')}</td>
                  <td>{pesos(m.facturado)}</td>
                  <td>{n(m.recaudo, '%')}</td>
                  <td>{m.pqrsf}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </>
  );
}

function Bloque({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <>
      <h2 style={{ fontSize: '1rem', marginTop: 24 }}>{titulo}</h2>
      <div className="tarjetas">{children}</div>
    </>
  );
}

function Dato({
  v,
  r,
  alerta,
  nota,
}: {
  v: number | string;
  r: string;
  alerta?: boolean;
  nota?: string;
}) {
  return (
    <div className="tarjeta" style={alerta ? { borderColor: '#B4261A' } : undefined} title={nota}>
      <strong style={{ fontSize: '1.35rem', color: alerta ? '#B4261A' : undefined }}>{v}</strong>
      <span className="tenue">{r}</span>
      {nota && <span className="tenue" style={{ fontSize: '0.7rem', marginTop: 4 }}>{nota}</span>}
    </div>
  );
}
