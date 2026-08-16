'use client';

import { useCallback, useEffect, useState } from 'react';

import { api } from '../../lib/api';

interface Factura {
  id: string;
  number: string;
  status: string;
  subtotal: string;
  discount: string;
  copay: string;
  total: string;
  pagado: string;
  saldo: string;
  issuedAt: string | null;
  dueDate: string | null;
  filedNumber: string | null;
  person: { id: string; displayName: string; docNumber: string | null };
  payer: { id: string; name: string } | null;
  site: { code: string };
  items: { id: string; description: string; quantity: number; unitPrice: string; total: string }[];
  payments: { id: string; amount: string; method: string; receivedAt: string; reference: string | null }[];
  glosas: { id: string; code: string; reason: string; amount: string; status: string; acceptedAmount: string | null }[];
}

interface Cartera {
  tramos: Record<string, string>;
  total: string;
  enGlosa: string;
  porPagador: { nombre: string; saldo: string; facturas: number }[];
  detalle: { id: string; numero: string; pagador: string; paciente: string; saldo: string; diasVencida: number }[];
}

const pesos = (v: string | number) =>
  Number(v).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

const fecha = (s: string | null) =>
  s ? new Date(s).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const ROTULO_TRAMO: Record<string, string> = {
  alDia: 'Al día',
  d1a30: '1 a 30 días',
  d31a60: '31 a 60',
  d61a90: '61 a 90',
  mas90: 'Más de 90',
};

export default function Facturacion() {
  const [vista, setVista] = useState<'facturas' | 'cartera'>('cartera');
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [cartera, setCartera] = useState<Cartera | null>(null);
  const [abierta, setAbierta] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    try {
      const [f, c] = await Promise.all([
        api.get<Factura[]>('/facturacion'),
        api.get<Cartera>('/facturacion/cartera'),
      ]);
      setFacturas(f);
      setCartera(c);
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
      <span className="miga">Administración</span>
      <h1>Facturación y cartera</h1>
      <p className="sub" style={{ maxWidth: 720 }}>
        Cuenta de cobro interna. La factura electrónica ante la DIAN la emite un proveedor
        autorizado y sigue fuera de alcance; lo que hace falta antes es saber cuánto se debe, quién
        lo debe y desde hace cuánto.
      </p>

      <div className="acciones" style={{ marginTop: 12 }}>
        <button
          className={`btn-mini${vista === 'cartera' ? '' : ' tenue'}`}
          type="button"
          onClick={() => setVista('cartera')}
        >
          Cartera
        </button>
        <button
          className={`btn-mini${vista === 'facturas' ? '' : ' tenue'}`}
          type="button"
          onClick={() => setVista('facturas')}
        >
          Facturas ({facturas.length})
        </button>
      </div>

      {error && <p className="error" role="alert">{error}</p>}

      {vista === 'cartera' && cartera && (
        <>
          <div className="tarjetas" style={{ marginTop: 16 }}>
            {Object.entries(cartera.tramos).map(([k, v]) => (
              <div
                key={k}
                className="tarjeta"
                // Lo que importa no es el total: es cuánto lleva más de 90
                // días, que es lo que se está a punto de perder.
                style={k === 'mas90' && Number(v) > 0 ? { borderColor: '#B4261A' } : undefined}
              >
                <strong style={{ fontSize: '1.15rem', color: k === 'mas90' && Number(v) > 0 ? '#B4261A' : undefined }}>
                  {pesos(v)}
                </strong>
                <span className="tenue">{ROTULO_TRAMO[k]}</span>
              </div>
            ))}
            <div className="tarjeta">
              <strong style={{ fontSize: '1.15rem' }}>{pesos(cartera.enGlosa)}</strong>
              <span className="tenue">En glosa</span>
            </div>
          </div>

          <h2 style={{ fontSize: '1rem', marginTop: 24 }}>Por pagador</h2>
          <table className="tabla">
            <thead>
              <tr>
                <th>Pagador</th>
                <th>Facturas</th>
                <th style={{ textAlign: 'right' }}>Saldo</th>
              </tr>
            </thead>
            <tbody>
              {cartera.porPagador.map((p) => (
                <tr key={p.nombre}>
                  <td>{p.nombre}</td>
                  <td>{p.facturas}</td>
                  <td style={{ textAlign: 'right' }}>{pesos(p.saldo)}</td>
                </tr>
              ))}
              {!cartera.porPagador.length && (
                <tr>
                  <td colSpan={3} className="tenue">Sin saldos pendientes.</td>
                </tr>
              )}
            </tbody>
          </table>

          {cartera.detalle.length > 0 && (
            <>
              <h2 style={{ fontSize: '1rem', marginTop: 24 }}>Lo más vencido primero</h2>
              <table className="tabla">
                <thead>
                  <tr>
                    <th>Factura</th>
                    <th>Paciente</th>
                    <th>Pagador</th>
                    <th>Vencida</th>
                    <th style={{ textAlign: 'right' }}>Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {cartera.detalle.map((d) => (
                    <tr key={d.id}>
                      <td><b>{d.numero}</b></td>
                      <td>{d.paciente}</td>
                      <td>{d.pagador}</td>
                      <td style={{ color: d.diasVencida > 90 ? '#B4261A' : undefined }}>
                        {d.diasVencida > 0 ? `${d.diasVencida} días` : 'al día'}
                      </td>
                      <td style={{ textAlign: 'right' }}>{pesos(d.saldo)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </>
      )}

      {vista === 'facturas' && (
        <div style={{ marginTop: 16, display: 'grid', gap: 10 }}>
          {!facturas.length && <p className="tenue">Todavía no hay facturas.</p>}
          {facturas.map((f) => (
            <Detalle
              key={f.id}
              f={f}
              abierta={abierta === f.id}
              alAbrir={() => setAbierta(abierta === f.id ? null : f.id)}
              alCambiar={cargar}
            />
          ))}
        </div>
      )}
    </>
  );
}

function Detalle({
  f,
  abierta,
  alAbrir,
  alCambiar,
}: {
  f: Factura;
  abierta: boolean;
  alAbrir: () => void;
  alCambiar: () => void;
}) {
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
      <div className="cabecera-fila" onClick={alAbrir} role="button" tabIndex={0}>
        <div>
          <strong>{f.number}</strong> <span className="tenue">· {f.person.displayName}</span>
          <div className="tenue" style={{ fontSize: '0.8rem' }}>
            {f.payer?.name ?? 'Particular'} · {f.site.code} · emitida {fecha(f.issuedAt)}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <strong>{pesos(f.total)}</strong>
          <div className="tenue" style={{ fontSize: '0.78rem' }}>
            {f.status.toLowerCase()}
            {Number(f.saldo) > 0 && ` · debe ${pesos(f.saldo)}`}
          </div>
        </div>
      </div>

      {abierta && (
        <div style={{ padding: '4px 14px 16px' }}>
          {error && <p className="error" role="alert">{error}</p>}

          <table className="tabla" style={{ marginTop: 8 }}>
            <tbody>
              {f.items.map((i) => (
                <tr key={i.id}>
                  <td>{i.description}</td>
                  <td className="tenue">× {i.quantity}</td>
                  <td style={{ textAlign: 'right' }}>{pesos(i.total)}</td>
                </tr>
              ))}
              {Number(f.discount) > 0 && (
                <tr className="tenue">
                  <td colSpan={2}>Descuento</td>
                  <td style={{ textAlign: 'right' }}>−{pesos(f.discount)}</td>
                </tr>
              )}
              {Number(f.copay) > 0 && (
                <tr>
                  <td colSpan={2}>
                    Copago del paciente
                    <div className="tenue" style={{ fontSize: '0.75rem' }}>
                      Se cobra en mostrador el mismo día; el resto se radica.
                    </div>
                  </td>
                  <td style={{ textAlign: 'right' }}>{pesos(f.copay)}</td>
                </tr>
              )}
              <tr>
                <td colSpan={2}><b>Total</b></td>
                <td style={{ textAlign: 'right' }}><b>{pesos(f.total)}</b></td>
              </tr>
            </tbody>
          </table>

          {f.payments.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <h4 style={{ fontSize: '0.85rem', margin: '0 0 4px' }}>Pagos</h4>
              {f.payments.map((p) => (
                <div key={p.id} className="tenue" style={{ fontSize: '0.8rem' }}>
                  {fecha(p.receivedAt)} · {p.method.replace('_', ' ').toLowerCase()} ·{' '}
                  {pesos(p.amount)} {p.reference ? `· ${p.reference}` : ''}
                </div>
              ))}
            </div>
          )}

          {f.glosas.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <h4 style={{ fontSize: '0.85rem', margin: '0 0 4px' }}>Glosas</h4>
              {f.glosas.map((g) => (
                <div key={g.id} style={{ fontSize: '0.82rem', marginBottom: 6 }}>
                  <b>{g.code}</b> · {pesos(g.amount)} · {g.status.toLowerCase()}
                  <div className="tenue">{g.reason}</div>
                  {g.status === 'RECIBIDA' && (
                    <button
                      className="btn-mini"
                      type="button"
                      style={{ marginTop: 4 }}
                      onClick={() => {
                        const answer = window.prompt('Respuesta a la glosa:');
                        if (!answer) return;
                        const acepta = window.prompt('Valor que se acepta perder (0 si se pelea todo):', '0');
                        void accion(() =>
                          api.post(`/facturacion/glosas/${g.id}/responder`, {
                            answer,
                            acceptedAmount: Number(acepta ?? 0),
                          }),
                        );
                      }}
                    >
                      Responder
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="acciones" style={{ marginTop: 14 }}>
            {f.status === 'BORRADOR' && (
              <button
                className="btn-mini"
                type="button"
                onClick={() => {
                  const dias = window.prompt('Plazo de pago en días (0 = de contado):', '30');
                  if (dias === null) return;
                  void accion(() => api.post(`/facturacion/${f.id}/emitir`, { diasPlazo: Number(dias) }));
                }}
              >
                Emitir
              </button>
            )}
            {f.status === 'EMITIDA' && Number(f.saldo) > 0 && (
              <button
                className="btn-mini"
                type="button"
                onClick={() => {
                  const monto = window.prompt(`Valor recibido (saldo ${pesos(f.saldo)}):`, f.saldo);
                  if (!monto) return;
                  const medio = window.prompt('Medio: EFECTIVO, TARJETA_DEBITO, TARJETA_CREDITO, TRANSFERENCIA, PSE', 'EFECTIVO');
                  if (!medio) return;
                  const ref = window.prompt('Referencia o comprobante:') || undefined;
                  void accion(() =>
                    api.post(`/facturacion/${f.id}/pagos`, { amount: Number(monto), method: medio, reference: ref }),
                  );
                }}
              >
                Registrar pago
              </button>
            )}
            {f.status === 'EMITIDA' && f.payer && !f.filedNumber && (
              <button
                className="btn-mini"
                type="button"
                onClick={() => {
                  const numero = window.prompt('Número de radicado ante el asegurador:');
                  if (!numero) return;
                  void accion(() => api.post(`/facturacion/${f.id}/radicar`, { numero }));
                }}
              >
                Radicar
              </button>
            )}
            {f.status === 'EMITIDA' && (
              <button
                className="btn-mini"
                type="button"
                onClick={() => {
                  const code = window.prompt('Código de glosa (Res. 3047):');
                  if (!code) return;
                  const reason = window.prompt('Motivo:');
                  if (!reason) return;
                  const amount = window.prompt('Valor glosado:');
                  if (!amount) return;
                  void accion(() =>
                    api.post(`/facturacion/${f.id}/glosas`, { code, reason, amount: Number(amount) }),
                  );
                }}
              >
                Registrar glosa
              </button>
            )}
            {f.status !== 'ANULADA' && !f.payments.length && (
              <button
                className="btn-mini peligro"
                type="button"
                onClick={() => {
                  const motivo = window.prompt('Motivo de la anulación:');
                  if (!motivo) return;
                  void accion(() => api.post(`/facturacion/${f.id}/anular`, { motivo }));
                }}
              >
                Anular
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
