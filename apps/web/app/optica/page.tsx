'use client';

import { useCallback, useEffect, useState } from 'react';

import { api } from '../../lib/api';

interface Orden {
  id: string;
  number: string;
  status: string;
  lab: string | null;
  promisedAt: string | null;
  deliveredAt: string | null;
  deliveredTo: string | null;
  warrantyMonths: number;
  price: string | null;
  frameOwn: boolean;
  frameNote: string | null;
  lensNote: string | null;
  diasDeAtraso: number;
  enGarantia: boolean;
  person: { id: string; displayName: string; phone: string | null };
  site: { code: string };
  frameProduct: { name: string; brand: string | null } | null;
  lensProduct: { name: string } | null;
  prescription: {
    odSphere: string | null;
    odCylinder: string | null;
    odAxis: number | null;
    oiSphere: string | null;
    oiCylinder: string | null;
    oiAxis: number | null;
    lensType: string | null;
  };
}

const fecha = (s: string | null) => (s ? s.slice(0, 10) : '—');

/** Una fórmula se lee como la escribe un optómetra, no como columnas sueltas. */
const graduacion = (esf: string | null, cil: string | null, eje: number | null) => {
  if (esf === null && cil === null) return '—';
  const signo = (v: string) => (Number(v) > 0 ? `+${Number(v).toFixed(2)}` : Number(v).toFixed(2));
  return [
    esf !== null ? signo(esf) : 'plano',
    cil !== null && Number(cil) !== 0 ? `${signo(cil)} × ${eje ?? '?'}°` : '',
  ]
    .filter(Boolean)
    .join(' ');
};

export default function Optica() {
  const [ordenes, setOrdenes] = useState<Orden[]>([]);
  const [filtro, setFiltro] = useState('');
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    try {
      setOrdenes(await api.get<Orden[]>(`/optica/ordenes${filtro ? `?status=${filtro}` : ''}`));
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [filtro]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const atrasadas = ordenes.filter((o) => o.diasDeAtraso > 0);

  return (
    <>
      <span className="miga">Comercial</span>
      <h1>Óptica</h1>
      <p className="sub" style={{ maxWidth: 720 }}>
        Fórmula, orden al laboratorio y entrega. El inventario se descarga al <b>entregar</b>, no al
        pedir: entre una cosa y otra pasan semanas, y descontar antes deja la montura fuera del
        inventario mientras sigue en la vitrina.
      </p>

      {error && <p className="error" role="alert">{error}</p>}

      {atrasadas.length > 0 && (
        <div className="aviso" style={{ marginTop: 14, borderColor: '#B4261A' }}>
          <b>{atrasadas.length} orden(es) pasadas de la fecha prometida al paciente.</b>
          <ul style={{ margin: '6px 0 0 18px', fontSize: '0.85rem' }}>
            {atrasadas.map((o) => (
              <li key={o.id}>
                {o.number} · {o.person.displayName} · {o.lab ?? 'sin laboratorio'} ·{' '}
                <b>{o.diasDeAtraso} días</b>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="acciones" style={{ marginTop: 18 }}>
        {['', 'TOMADA', 'EN_LABORATORIO', 'RECIBIDA', 'ENTREGADA'].map((f) => (
          <button
            key={f}
            className={`btn-mini${filtro === f ? '' : ' tenue'}`}
            type="button"
            onClick={() => setFiltro(f)}
          >
            {f === '' ? 'Todas' : f.replace('_', ' ').toLowerCase()}
          </button>
        ))}
      </div>

      <div style={{ marginTop: 16, display: 'grid', gap: 8 }}>
        {ordenes.map((o) => (
          <Tarjeta key={o.id} o={o} alCambiar={cargar} />
        ))}
        {!ordenes.length && <p className="tenue">No hay órdenes.</p>}
      </div>
    </>
  );
}

function Tarjeta({ o, alCambiar }: { o: Orden; alCambiar: () => void }) {
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

  return (
    <div className="fila-lista">
      <div className="cabecera-fila">
        <div>
          <strong>{o.number}</strong> <span className="tenue">· {o.person.displayName}</span>
          <div className="tenue" style={{ fontSize: '0.8rem' }}>
            OD {graduacion(o.prescription.odSphere, o.prescription.odCylinder, o.prescription.odAxis)}
            {'  ·  '}
            OI {graduacion(o.prescription.oiSphere, o.prescription.oiCylinder, o.prescription.oiAxis)}
            {o.prescription.lensType ? ` · ${o.prescription.lensType}` : ''}
          </div>
          <div className="tenue" style={{ fontSize: '0.8rem' }}>
            {o.frameOwn ? 'Montura del paciente' : (o.frameProduct?.name ?? o.frameNote ?? 'sin montura')}
            {o.lensProduct?.name || o.lensNote ? ` · ${o.lensProduct?.name ?? o.lensNote}` : ''}
            {o.lab ? ` · ${o.lab}` : ''}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <strong style={{ fontSize: '0.9rem' }}>{o.status.replace('_', ' ').toLowerCase()}</strong>
          <div className="tenue" style={{ fontSize: '0.78rem' }}>
            {o.deliveredAt
              ? `entregada ${fecha(o.deliveredAt)}${o.enGarantia ? ' · en garantía' : ''}`
              : `prometida ${fecha(o.promisedAt)}`}
          </div>
          {o.diasDeAtraso > 0 && (
            <div style={{ color: '#B4261A', fontSize: '0.78rem' }}>{o.diasDeAtraso} días de atraso</div>
          )}
        </div>
      </div>

      {error && <p className="error" role="alert" style={{ margin: '0 14px 8px' }}>{error}</p>}

      <div className="acciones" style={{ padding: '0 14px 12px' }}>
        {o.status === 'TOMADA' && (
          <button
            className="btn-mini"
            type="button"
            onClick={() => {
              const lab = window.prompt('Laboratorio:', o.lab ?? '');
              if (!lab) return;
              const promisedAt = window.prompt('Fecha prometida al paciente (AAAA-MM-DD):') || undefined;
              void accion(() => api.post(`/optica/ordenes/${o.id}/laboratorio`, { lab, promisedAt }));
            }}
          >
            Enviar al laboratorio
          </button>
        )}
        {o.status === 'EN_LABORATORIO' && (
          <button className="btn-mini" type="button" onClick={() => void accion(() => api.post(`/optica/ordenes/${o.id}/recibir`, {}))}>
            Llegó del laboratorio
          </button>
        )}
        {o.status === 'RECIBIDA' && (
          <button
            className="btn-mini"
            type="button"
            onClick={() => {
              const quien = window.prompt('¿Quién recibe? (vacío = el paciente)') || undefined;
              void accion(() => api.post(`/optica/ordenes/${o.id}/entregar`, { deliveredTo: quien }));
            }}
          >
            Entregar
          </button>
        )}
        {o.status !== 'ENTREGADA' && o.status !== 'ANULADA' && (
          <button
            className="btn-mini peligro"
            type="button"
            onClick={() => {
              const motivo = window.prompt('Motivo de la anulación:');
              if (!motivo) return;
              void accion(() => api.post(`/optica/ordenes/${o.id}/anular`, { motivo }));
            }}
          >
            Anular
          </button>
        )}
      </div>
    </div>
  );
}
