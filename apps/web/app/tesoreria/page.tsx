'use client';

import { useCallback, useEffect, useState } from 'react';

import { api } from '../../lib/api';

interface Sede { id: string; code: string; name: string }

interface Esperado {
  fecha: string;
  efectivo: string;
  tarjeta: string;
  transferencia: string;
  otros: string;
  total: string;
  movimientos: number;
  detalle: { hora: string; factura: string; paciente: string; medio: string; referencia: string | null; valor: string }[];
}

interface Cierre {
  id: string;
  date: string;
  expectedCash: string;
  countedCash: string;
  difference: string;
  notes: string | null;
  site: { code: string };
  closedBy: { firstName: string; lastName: string } | null;
}

interface Historico {
  cierres: Cierre[];
  diasConDescuadre: number;
  sumaDescuadres: string;
  faltantes: string;
}

interface SinCerrar { sede: string; fecha: string; siteId: string }

const pesos = (v: string | number) =>
  Number(v).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

/**
 * El día de caja, no el día UTC: a las 8 de la noche en Bogotá el navegador
 * ya diría "mañana" si se usara toISOString a secas, y el cierre se haría
 * sobre el día equivocado.
 */
const hoyLocal = () => new Date(Date.now() - 5 * 3_600_000).toISOString().slice(0, 10);

export default function Tesoreria() {
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [siteId, setSiteId] = useState('');
  const [fecha, setFecha] = useState(hoyLocal());
  const [esperado, setEsperado] = useState<Esperado | null>(null);
  const [historico, setHistorico] = useState<Historico | null>(null);
  const [sinCerrar, setSinCerrar] = useState<SinCerrar[]>([]);
  const [contado, setContado] = useState('');
  const [base, setBase] = useState('0');
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  useEffect(() => {
    void api.get<Sede[]>('/catalogo/sedes').then((s) => {
      setSedes(s);
      if (s[0]) setSiteId(s[0].id);
    });
  }, []);

  const cargar = useCallback(async () => {
    if (!siteId) return;
    try {
      const [e, h, s] = await Promise.all([
        api.get<Esperado>(`/tesoreria/esperado?siteId=${siteId}&fecha=${fecha}`),
        api.get<Historico>('/tesoreria/cierres'),
        api.get<SinCerrar[]>('/tesoreria/sin-cerrar'),
      ]);
      setEsperado(e);
      setHistorico(h);
      setSinCerrar(s);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [siteId, fecha]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  async function cerrar() {
    setError(null);
    setAviso(null);
    try {
      const r = await api.post<{ mensaje: string }>('/tesoreria/cierres', {
        siteId,
        fecha,
        countedCash: Number(contado),
        openingFloat: Number(base || 0),
      });
      setAviso(r.mensaje);
      setContado('');
      await cargar();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const diferencia =
    esperado && contado !== '' ? Number(contado) - (Number(esperado.efectivo) + Number(base || 0)) : null;

  return (
    <>
      <span className="miga">Dinero</span>
      <h1>Tesorería</h1>
      <p className="sub" style={{ maxWidth: 760 }}>
        El sistema sabe cuánto <b>debería</b> haber en caja. Lo que no sabe es cuánto <b>hay</b>, y
        esa diferencia es el único dato que importa. Una caja que siempre cuadra al peso es una caja
        que no se está contando.
      </p>

      {error && <p className="error" role="alert">{error}</p>}
      {aviso && <p className="aviso" role="status"><b>{aviso}</b></p>}

      {sinCerrar.length > 0 && (
        <div className="aviso" style={{ marginTop: 14, borderColor: '#B4261A' }}>
          <b>{sinCerrar.length} día(s) con dinero recibido que nadie cerró.</b>
          <div style={{ marginTop: 6 }}>
            {sinCerrar.map((d) => (
              <button
                key={`${d.siteId}${d.fecha}`}
                className="btn-mini"
                type="button"
                style={{ marginRight: 6 }}
                onClick={() => {
                  setSiteId(d.siteId);
                  setFecha(d.fecha);
                }}
              >
                {d.sede} · {d.fecha}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="rejilla-form" style={{ marginTop: 18, maxWidth: 520 }}>
        <label>
          Sede
          <select value={siteId} onChange={(e) => setSiteId(e.target.value)}>
            {sedes.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </label>
        <label>
          Día
          <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} max={hoyLocal()} />
        </label>
      </div>

      {esperado && (
        <>
          <div className="tarjetas" style={{ marginTop: 16 }}>
            <div className="tarjeta"><strong style={{ fontSize: '1.2rem' }}>{pesos(esperado.efectivo)}</strong><span className="tenue">Efectivo esperado</span></div>
            <div className="tarjeta"><strong style={{ fontSize: '1.2rem' }}>{pesos(esperado.tarjeta)}</strong><span className="tenue">Tarjeta · contra datáfono</span></div>
            <div className="tarjeta"><strong style={{ fontSize: '1.2rem' }}>{pesos(esperado.transferencia)}</strong><span className="tenue">Transferencia · contra extracto</span></div>
            <div className="tarjeta"><strong style={{ fontSize: '1.2rem' }}>{pesos(esperado.total)}</strong><span className="tenue">Total · {esperado.movimientos} movimientos</span></div>
          </div>

          <div className="panel-agendar" style={{ marginTop: 18, maxWidth: 520 }}>
            <h3 style={{ margin: 0, fontSize: '1rem' }}>Arqueo</h3>
            <div className="rejilla-form" style={{ marginTop: 10 }}>
              <label>
                Base con la que abrió
                <input type="number" min={0} value={base} onChange={(e) => setBase(e.target.value)} />
              </label>
              <label>
                Efectivo contado
                <input
                  type="number"
                  min={0}
                  value={contado}
                  onChange={(e) => setContado(e.target.value)}
                  placeholder="cuente antes de mirar el esperado"
                />
              </label>
            </div>

            {diferencia !== null && (
              <p style={{ marginTop: 10, color: diferencia === 0 ? undefined : '#B4261A' }}>
                {diferencia === 0
                  ? 'Cuadra.'
                  : diferencia > 0
                    ? `Sobran ${pesos(diferencia)}.`
                    : `Faltan ${pesos(Math.abs(diferencia))}.`}
              </p>
            )}

            <div className="acciones" style={{ marginTop: 12 }}>
              <button className="btn-mini" type="button" disabled={contado === ''} onClick={() => void cerrar()}>
                Cerrar caja del {fecha}
              </button>
            </div>
            <p className="tenue" style={{ fontSize: '0.78rem', marginTop: 8 }}>
              Una vez cerrada no se vuelve a cerrar: si se pudiera, un descuadre se
              &ldquo;arreglaría&rdquo; contando otra vez.
            </p>
          </div>

          {esperado.detalle.length > 0 && (
            <>
              <h2 style={{ fontSize: '1rem', marginTop: 24 }}>Movimientos del día</h2>
              <table className="tabla">
                <thead><tr><th>Hora</th><th>Factura</th><th>Paciente</th><th>Medio</th><th style={{ textAlign: 'right' }}>Valor</th></tr></thead>
                <tbody>
                  {esperado.detalle.map((d, i) => (
                    <tr key={i}>
                      <td className="tenue">{d.hora}</td>
                      <td>{d.factura}</td>
                      <td>{d.paciente}</td>
                      <td className="tenue">
                        {d.medio.replace(/_/g, ' ').toLowerCase()}
                        {d.referencia ? ` · ${d.referencia}` : ''}
                      </td>
                      <td style={{ textAlign: 'right' }}>{pesos(d.valor)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </>
      )}

      {historico && historico.cierres.length > 0 && (
        <>
          <h2 style={{ fontSize: '1rem', marginTop: 28 }}>Cierres anteriores</h2>
          <p className="tenue" style={{ fontSize: '0.82rem' }}>
            {historico.diasConDescuadre} día(s) no cuadraron, {pesos(historico.faltantes)} en
            faltantes. Un peso de diferencia todos los días es un problema distinto a cien mil una
            sola vez.
          </p>
          <table className="tabla">
            <thead><tr><th>Día</th><th>Sede</th><th>Esperado</th><th>Contado</th><th>Diferencia</th><th>Cerró</th></tr></thead>
            <tbody>
              {historico.cierres.map((c) => (
                <tr key={c.id}>
                  <td>{c.date.slice(0, 10)}</td>
                  <td className="tenue">{c.site.code}</td>
                  <td>{pesos(c.expectedCash)}</td>
                  <td>{pesos(c.countedCash)}</td>
                  <td style={Number(c.difference) !== 0 ? { color: '#B4261A', fontWeight: 600 } : undefined}>
                    {Number(c.difference) === 0 ? '—' : pesos(c.difference)}
                  </td>
                  <td className="tenue">{c.closedBy?.firstName ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </>
  );
}
