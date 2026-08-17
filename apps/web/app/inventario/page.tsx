'use client';

import { useCallback, useEffect, useState } from 'react';

import { api } from '../../lib/api';

interface Nivel {
  siteId: string;
  lot: string;
  expiresAt: string | null;
  quantity: number;
  minQty: number | null;
  site: { code: string };
}

interface Producto {
  id: string;
  sku: string;
  name: string;
  kind: string;
  brand: string | null;
  unit: string;
  invima: string | null;
  tracksLot: boolean;
  minQty: number;
  salePrice: string | null;
  isActive: boolean;
  levels: Nivel[];
}

interface Alertas {
  bajoMinimo: { producto: string; sku: string; sede: string; hay: number; minimo: number }[];
  vencidos: { producto: string; sede: string; lote: string | null; cantidad: number; vence: string | null }[];
  porVencer: { producto: string; sede: string; lote: string | null; cantidad: number; vence: string | null }[];
}

interface Sede {
  id: string;
  code: string;
  name: string;
}

const TIPOS = [
  'INSUMO',
  'MEDICAMENTO',
  'MATERIAL_QUIRURGICO',
  'LENTE_INTRAOCULAR',
  'MONTURA',
  'LENTE_OFTALMICO',
  'LENTE_CONTACTO',
  'OTRO',
];

export default function Inventario() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [alertas, setAlertas] = useState<Alertas | null>(null);
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [buscar, setBuscar] = useState('');
  const [nuevo, setNuevo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    try {
      const [p, a] = await Promise.all([
        api.get<Producto[]>(`/inventario/productos${buscar ? `?buscar=${encodeURIComponent(buscar)}` : ''}`),
        api.get<Alertas>('/inventario/alertas'),
      ]);
      setProductos(p);
      setAlertas(a);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [buscar]);

  useEffect(() => {
    void cargar();
    void api.get<Sede[]>('/catalogo/sedes').then(setSedes).catch(() => undefined);
  }, [cargar]);

  return (
    <>
      <span className="miga">Administración</span>
      <h1>Inventario</h1>
      <p className="sub" style={{ maxWidth: 720 }}>
        El saldo es una caché; la verdad es el libro de movimientos, que no se puede editar ni
        borrar. Un movimiento borrado es un faltante que nadie puede explicar.
      </p>

      {error && <p className="error" role="alert">{error}</p>}

      {alertas && (
        <>
          {/* Un inventario que solo lista existencias no sirve: nadie lee 400
              filas. Lo accionable va primero. */}
          {alertas.vencidos.length > 0 && (
            <div className="aviso" style={{ marginTop: 14, borderColor: '#B4261A' }}>
              <b>{alertas.vencidos.length} lote(s) vencidos en existencia.</b> No se pueden usar en
              un paciente: hay que darlos de baja.
              <ul style={{ margin: '6px 0 0 18px', fontSize: '0.85rem' }}>
                {alertas.vencidos.map((v, i) => (
                  <li key={i}>
                    {v.producto} · {v.sede} · lote {v.lote} · {v.cantidad} und · venció {v.vence}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="tarjetas" style={{ marginTop: 14 }}>
            <div className="tarjeta" style={alertas.bajoMinimo.length ? { borderColor: '#B4261A' } : undefined}>
              <strong style={{ fontSize: '1.6rem' }}>{alertas.bajoMinimo.length}</strong>
              <span className="tenue">Bajo el mínimo</span>
            </div>
            <div className="tarjeta">
              <strong style={{ fontSize: '1.6rem' }}>{alertas.porVencer.length}</strong>
              <span className="tenue">Vencen en 30 días</span>
            </div>
            <div className="tarjeta">
              <strong style={{ fontSize: '1.6rem' }}>{productos.length}</strong>
              <span className="tenue">Productos activos</span>
            </div>
          </div>

          {alertas.bajoMinimo.length > 0 && (
            <>
              <h2 style={{ fontSize: '1rem', marginTop: 22 }}>Hay que reponer</h2>
              <table className="tabla">
                <thead>
                  <tr><th>Producto</th><th>Sede</th><th>Hay</th><th>Mínimo</th></tr>
                </thead>
                <tbody>
                  {alertas.bajoMinimo.map((b, i) => (
                    <tr key={i}>
                      <td>{b.producto} <span className="tenue">{b.sku}</span></td>
                      <td>{b.sede}</td>
                      <td style={{ color: '#B4261A' }}><b>{b.hay}</b></td>
                      <td className="tenue">{b.minimo}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </>
      )}

      <div className="acciones" style={{ marginTop: 24, alignItems: 'center' }}>
        <input
          placeholder="Buscar por nombre, SKU o marca…"
          value={buscar}
          onChange={(e) => setBuscar(e.target.value)}
          style={{ minWidth: 280 }}
        />
        <button className="btn-mini" type="button" onClick={() => setNuevo(!nuevo)}>
          {nuevo ? 'Cancelar' : 'Nuevo producto'}
        </button>
      </div>

      {nuevo && <NuevoProducto alGuardar={() => { setNuevo(false); void cargar(); }} />}

      <div style={{ marginTop: 16, display: 'grid', gap: 8 }}>
        {productos.map((p) => (
          <Ficha key={p.id} p={p} sedes={sedes} alCambiar={cargar} />
        ))}
        {!productos.length && <p className="tenue">Sin productos.</p>}
      </div>
    </>
  );
}

function NuevoProducto({ alGuardar }: { alGuardar: () => void }) {
  const [d, setD] = useState({ sku: '', name: '', kind: 'INSUMO', brand: '', minQty: 0, tracksLot: false });
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="panel-agendar" style={{ marginTop: 12 }}>
      <div className="rejilla-form">
        <label>SKU<input value={d.sku} onChange={(e) => setD({ ...d, sku: e.target.value })} /></label>
        <label>Nombre<input value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} /></label>
        <label>
          Tipo
          <select value={d.kind} onChange={(e) => setD({ ...d, kind: e.target.value })}>
            {TIPOS.map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ').toLowerCase()}</option>)}
          </select>
        </label>
        <label>Marca<input value={d.brand} onChange={(e) => setD({ ...d, brand: e.target.value })} /></label>
        <label>
          Mínimo antes de reponer
          <input type="number" min={0} value={d.minQty} onChange={(e) => setD({ ...d, minQty: Number(e.target.value) })} />
        </label>
      </div>
      <label className="interno" style={{ marginTop: 8 }}>
        <input type="checkbox" checked={d.tracksLot} onChange={(e) => setD({ ...d, tracksLot: e.target.checked })} />
        Exige lote y vencimiento
        <span className="tenue"> — obligatorio en medicamentos y material quirúrgico</span>
      </label>
      {error && <p className="error" role="alert">{error}</p>}
      <div className="acciones" style={{ marginTop: 12 }}>
        <button
          className="btn-mini"
          type="button"
          disabled={!d.sku || !d.name}
          onClick={() =>
            void api
              .post('/inventario/productos', { ...d, brand: d.brand || undefined })
              .then(alGuardar)
              .catch((e: Error) => setError(e.message))
          }
        >
          Guardar
        </button>
      </div>
    </div>
  );
}

function Ficha({ p, sedes, alCambiar }: { p: Producto; sedes: Sede[]; alCambiar: () => void }) {
  const [abierto, setAbierto] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const total = p.levels.reduce((s, l) => s + l.quantity, 0);

  async function mover(kind: string, siteId: string) {
    const cantidad = window.prompt(`Cantidad a ${kind === 'ENTRADA' ? 'ingresar' : kind.toLowerCase()}:`);
    if (!cantidad) return;
    const lot = p.tracksLot ? window.prompt('Lote:') ?? '' : undefined;
    const expiresAt = p.tracksLot && kind === 'ENTRADA' ? window.prompt('Vence (AAAA-MM-DD):') ?? undefined : undefined;
    const reason = window.prompt('Motivo (opcional):') || undefined;
    try {
      await api.post('/inventario/movimientos', {
        productId: p.id,
        siteId,
        kind,
        quantity: Number(cantidad),
        lot,
        expiresAt,
        reason,
      });
      setError(null);
      alCambiar();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <div className="fila-lista">
      <div className="cabecera-fila" onClick={() => setAbierto(!abierto)} role="button" tabIndex={0}>
        <div>
          <strong>{p.name}</strong> <span className="tenue">· {p.sku}</span>
          <div className="tenue" style={{ fontSize: '0.8rem' }}>
            {p.kind.replace(/_/g, ' ').toLowerCase()}
            {p.brand ? ` · ${p.brand}` : ''}
            {p.tracksLot ? ' · con lote' : ''}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <strong style={{ color: p.minQty > 0 && total <= p.minQty ? '#B4261A' : undefined }}>
            {total} {p.unit}
          </strong>
          <div className="tenue" style={{ fontSize: '0.78rem' }}>en {p.levels.length} ubicación(es)</div>
        </div>
      </div>

      {abierto && (
        <div style={{ padding: '4px 14px 16px' }}>
          {error && <p className="error" role="alert">{error}</p>}
          <table className="tabla">
            <thead>
              <tr><th>Sede</th><th>Lote</th><th>Vence</th><th>Cantidad</th><th /></tr>
            </thead>
            <tbody>
              {p.levels.map((l, i) => (
                <tr key={i}>
                  <td>{l.site.code}</td>
                  <td className="tenue">{l.lot || '—'}</td>
                  <td
                    className="tenue"
                    style={l.expiresAt && new Date(l.expiresAt) < new Date() ? { color: '#B4261A' } : undefined}
                  >
                    {l.expiresAt?.slice(0, 10) ?? '—'}
                  </td>
                  <td>{l.quantity}</td>
                  <td>
                    <button className="btn-mini" type="button" onClick={() => void mover('SALIDA', l.siteId)}>
                      Salida
                    </button>
                  </td>
                </tr>
              ))}
              {!p.levels.length && <tr><td colSpan={5} className="tenue">Sin existencias.</td></tr>}
            </tbody>
          </table>

          <div className="acciones" style={{ marginTop: 10, flexWrap: 'wrap' }}>
            {sedes.map((s) => (
              <button key={s.id} className="btn-mini" type="button" onClick={() => void mover('ENTRADA', s.id)}>
                Entrada en {s.code}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
