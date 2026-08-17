'use client';

import { useCallback, useEffect, useState } from 'react';

import { api } from '../../lib/api';

interface Lead {
  id: string;
  status: string;
  source: string;
  interestText: string | null;
  quotedAmount: string | null;
  lostReason: string | null;
  convertedAt: string | null;
  createdAt: string;
  horasSinTocar: number;
  tieneCita: boolean;
  person: { id: string; displayName: string; phone: string | null };
  interestService: { id: string; name: string } | null;
  assignedTo: { id: string; firstName: string; lastName: string } | null;
  site: { code: string } | null;
  conversation: { id: string } | null;
}

interface Embudo {
  total: number;
  porEstado: Record<string, number>;
  porOrigen: Record<string, number>;
  convertidos: number;
  tasaConversion: number | null;
  diasHastaConvertir: number | null;
  valorCotizado: string;
  sinTocar: number;
  motivosDePerdida: { motivo: string; veces: number }[];
}

const pesos = (v: string | null) =>
  v === null ? '—' : Number(v).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

const ORDEN = ['NUEVO', 'CONTACTADO', 'CALIFICADO', 'COTIZADO', 'AGENDADO', 'CONVERTIDO', 'PERDIDO'];

export default function Leads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [embudo, setEmbudo] = useState<Embudo | null>(null);
  const [filtro, setFiltro] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    try {
      const [l, e] = await Promise.all([
        api.get<Lead[]>(`/leads${filtro === 'sinTocar' ? '?sinTocar=true' : filtro ? `?status=${filtro}` : ''}`),
        api.get<Embudo>('/leads/embudo'),
      ]);
      setLeads(l);
      setEmbudo(e);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [filtro]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  return (
    <>
      <span className="miga">Comercial</span>
      <h1>Leads</h1>
      <p className="sub" style={{ maxWidth: 760 }}>
        El lead cuelga del paciente desde su primer mensaje, no de una tabla aparte. La conversión
        no se marca a mano: un lead está convertido cuando esa persona tiene una cita creada
        <b> después</b> del lead. Un campo que alguien marca es un campo que se marca de más a fin
        de mes.
      </p>

      {error && <p className="error" role="alert">{error}</p>}

      {embudo && (
        <>
          {embudo.sinTocar > 0 && (
            <div className="aviso" style={{ marginTop: 14, borderColor: '#B4261A' }}>
              <b>{embudo.sinTocar} lead(s) que nadie ha mirado.</b> Un lead nuevo de hace tres días
              es un paciente que ya llamó a otra clínica.
            </div>
          )}

          <div className="tarjetas" style={{ marginTop: 14 }}>
            <div className="tarjeta"><strong style={{ fontSize: '1.5rem' }}>{embudo.total}</strong><span className="tenue">Leads</span></div>
            <div className="tarjeta"><strong style={{ fontSize: '1.5rem' }}>{embudo.convertidos}</strong><span className="tenue">Convertidos</span></div>
            <div className="tarjeta">
              <strong style={{ fontSize: '1.5rem' }}>{embudo.tasaConversion === null ? '—' : `${embudo.tasaConversion}%`}</strong>
              <span className="tenue">Conversión</span>
            </div>
            <div className="tarjeta" title="Un embudo que convierte al 30% en dos días vale más que uno que convierte al 35% en dos semanas.">
              <strong style={{ fontSize: '1.5rem' }}>{embudo.diasHastaConvertir === null ? '—' : `${embudo.diasHastaConvertir} d`}</strong>
              <span className="tenue">Hasta convertir</span>
            </div>
            <div className="tarjeta"><strong style={{ fontSize: '1.15rem' }}>{pesos(embudo.valorCotizado)}</strong><span className="tenue">Cotizado y ganado</span></div>
          </div>

          {embudo.motivosDePerdida.length > 0 && (
            <>
              <h2 style={{ fontSize: '1rem', marginTop: 22 }}>Por qué se pierden</h2>
              <p className="tenue" style={{ fontSize: '0.82rem' }}>
                &ldquo;Perdidos: 40&rdquo; no dice nada. &ldquo;Perdidos por precio: 30 de 40&rdquo; dice qué hacer.
              </p>
              <table className="tabla">
                <tbody>
                  {embudo.motivosDePerdida.map((m) => (
                    <tr key={m.motivo}><td>{m.motivo}</td><td style={{ textAlign: 'right' }}><b>{m.veces}</b></td></tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </>
      )}

      <div className="acciones" style={{ marginTop: 22, flexWrap: 'wrap' }}>
        <button className={`btn-mini${filtro === '' ? '' : ' tenue'}`} type="button" onClick={() => setFiltro('')}>Todos</button>
        <button className={`btn-mini${filtro === 'sinTocar' ? '' : ' tenue'}`} type="button" onClick={() => setFiltro('sinTocar')}>Sin tocar</button>
        {ORDEN.map((s) => (
          <button key={s} className={`btn-mini${filtro === s ? '' : ' tenue'}`} type="button" onClick={() => setFiltro(s)}>
            {s.toLowerCase()}
            {embudo?.porEstado[s] ? ` (${embudo.porEstado[s]})` : ''}
          </button>
        ))}
      </div>

      <div style={{ marginTop: 14, display: 'grid', gap: 8 }}>
        {leads.map((l) => <Fila key={l.id} l={l} alCambiar={cargar} />)}
        {!leads.length && <p className="tenue">No hay leads con ese filtro.</p>}
      </div>
    </>
  );
}

function Fila({ l, alCambiar }: { l: Lead; alCambiar: () => void }) {
  const [error, setError] = useState<string | null>(null);

  async function accion(fn: () => Promise<unknown>) {
    setError(null);
    try {
      await fn();
      alCambiar();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const frio = l.horasSinTocar > 48 && !['CONVERTIDO', 'PERDIDO'].includes(l.status);

  return (
    <div className="fila-lista">
      <div className="cabecera-fila">
        <div>
          <strong>{l.person.displayName}</strong>{' '}
          <span className="tenue">{l.person.phone ?? 'sin teléfono'}</span>
          <div className="tenue" style={{ fontSize: '0.8rem' }}>
            {l.interestService?.name ?? l.interestText ?? 'sin interés registrado'}
            {' · '}{l.source.toLowerCase()}
            {l.site ? ` · ${l.site.code}` : ''}
            {l.assignedTo ? ` · ${l.assignedTo.firstName}` : ' · sin asignar'}
          </div>
          {l.lostReason && <div className="tenue" style={{ fontSize: '0.8rem' }}>Perdido: {l.lostReason}</div>}
        </div>
        <div style={{ textAlign: 'right' }}>
          <strong style={{ fontSize: '0.9rem' }}>{l.status.toLowerCase()}</strong>
          <div className="tenue" style={{ fontSize: '0.78rem', color: frio ? '#B4261A' : undefined }}>
            {frio ? `${l.horasSinTocar} h sin tocar` : `hace ${l.horasSinTocar} h`}
          </div>
          {l.quotedAmount && <div className="tenue" style={{ fontSize: '0.78rem' }}>{pesos(l.quotedAmount)}</div>}
        </div>
      </div>

      {error && <p className="error" role="alert" style={{ margin: '0 14px 8px' }}>{error}</p>}

      <div className="acciones" style={{ padding: '0 14px 12px' }}>
        {l.conversation && (
          <a className="btn-mini" href={`/inbox?conversacion=${l.conversation.id}`}>Ver conversación</a>
        )}
        {!['CONVERTIDO', 'PERDIDO'].includes(l.status) && (
          <>
            <button
              className="btn-mini"
              type="button"
              onClick={() => {
                const monto = window.prompt('Valor cotizado:');
                if (!monto) return;
                void accion(() => api.post(`/leads/${l.id}/cotizar`, { amount: Number(monto) }));
              }}
            >
              Cotizar
            </button>
            <button
              className="btn-mini peligro"
              type="button"
              onClick={() => {
                // El motivo es obligatorio: es el dato con valor.
                const motivo = window.prompt('¿Por qué se perdió? (precio, distancia, se fue a otra…)');
                if (!motivo) return;
                void accion(() => api.post(`/leads/${l.id}/perder`, { motivo }));
              }}
            >
              Marcar perdido
            </button>
          </>
        )}
      </div>
    </div>
  );
}
