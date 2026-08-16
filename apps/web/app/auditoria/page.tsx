'use client';

import { useCallback, useEffect, useState } from 'react';

import { api } from '../../lib/api';

interface Fila {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  personId: string | null;
  ipAddress: string | null;
  oldValues: unknown;
  newValues: unknown;
  createdAt: string;
  user: { firstName: string; lastName: string; email: string } | null;
  person: { displayName: string } | null;
}

interface Pagina {
  total: number;
  pagina: number;
  porPagina: number;
  filas: Fila[];
}

interface Resumen {
  hoy: Record<string, number>;
  loginsFallidos: { ipAddress: string | null; newValues: { email?: string } | null; createdAt: string }[];
  lecturasDeFichaHoy: number;
  busquedasDePacienteHoy: number;
}

const ACCION: Record<string, { texto: string; clase: string }> = {
  CREATE: { texto: 'Creó', clase: 'disponible' },
  UPDATE: { texto: 'Modificó', clase: 'construccion' },
  DELETE: { texto: 'Dio de baja', clase: 'peligro' },
  READ: { texto: 'Consultó', clase: 'planeado' },
  EXPORT: { texto: 'Exportó', clase: 'peligro' },
  LOGIN: { texto: 'Entró', clase: 'planeado' },
  LOGIN_FAILED: { texto: 'Intento fallido', clase: 'peligro' },
  LOGOUT: { texto: 'Salió', clase: 'planeado' },
  PRINT: { texto: 'Imprimió', clase: 'construccion' },
  SHARE: { texto: 'Compartió', clase: 'peligro' },
  MERGE: { texto: 'Fusionó', clase: 'construccion' },
};

const ENTIDAD: Record<string, string> = {
  person: 'paciente',
  user: 'usuario',
  appointment: 'cita',
  professional: 'profesional',
  professional_availability: 'horario',
  resource_booking: 'reserva',
  audit_log: 'auditoría',
  prueba: 'prueba',
};

const cuando = (iso: string) =>
  new Date(iso).toLocaleString('es-CO', {
    timeZone: 'America/Bogota',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

export default function Auditoria() {
  const [datos, setDatos] = useState<Pagina | null>(null);
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [accion, setAccion] = useState('');
  const [entidad, setEntidad] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [pagina, setPagina] = useState(0);

  const cargar = useCallback(() => {
    const q = new URLSearchParams();
    if (accion) q.set('accion', accion);
    if (entidad) q.set('entidad', entidad);
    if (desde) q.set('desde', desde);
    if (hasta) q.set('hasta', hasta);
    q.set('pagina', String(pagina));

    return api
      .get<Pagina>(`/auditoria?${q}`)
      .then(setDatos)
      .catch((e: Error) => setError(e.message));
  }, [accion, entidad, desde, hasta, pagina]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  useEffect(() => {
    void api.get<Resumen>('/auditoria/resumen').then(setResumen).catch(() => undefined);
  }, []);

  const paginas = datos ? Math.ceil(datos.total / datos.porPagina) : 0;

  return (
    <>
      <span className="miga">Sistema</span>
      <h1>Auditoría</h1>
      <p className="sub">
        Quién consultó, creó, modificó o exportó. El registro es inmutable: la base rechaza
        modificarlo o borrarlo, incluso desde la propia aplicación.
      </p>

      {error && <p className="error" role="alert">{error}</p>}

      {resumen && (
        <>
          <div className="cifras">
            <div className="cifra">
              <b>{resumen.lecturasDeFichaHoy}</b>
              <span>Fichas de paciente consultadas hoy</span>
            </div>
            <div className="cifra">
              <b>{resumen.busquedasDePacienteHoy}</b>
              <span>Búsquedas de paciente hoy</span>
            </div>
            <div className="cifra">
              <b>{resumen.hoy.LOGIN ?? 0}</b>
              <span>Accesos hoy</span>
            </div>
            <div className={`cifra ${resumen.loginsFallidos.length > 3 ? 'ojo' : ''}`}>
              <b>{resumen.hoy.LOGIN_FAILED ?? 0}</b>
              <span>Intentos fallidos hoy</span>
            </div>
            <div className={`cifra ${(resumen.hoy.EXPORT ?? 0) > 0 ? 'ojo' : ''}`}>
              <b>{resumen.hoy.EXPORT ?? 0}</b>
              <span>Exportaciones hoy</span>
            </div>
          </div>

          {resumen.loginsFallidos.length > 3 && (
            <p className="alarma" role="alert">
              <span>
                {resumen.loginsFallidos.length} intentos fallidos hoy. Varios desde la misma
                dirección es la señal que hay que mirar:{' '}
                {[...new Set(resumen.loginsFallidos.map((f) => f.ipAddress))].join(', ')}
              </span>
            </p>
          )}
        </>
      )}

      <div className="filtros">
        <select value={accion} onChange={(e) => { setAccion(e.target.value); setPagina(0); }}>
          <option value="">Toda acción</option>
          {Object.entries(ACCION).map(([v, a]) => (
            <option key={v} value={v}>
              {a.texto}
            </option>
          ))}
        </select>
        <select value={entidad} onChange={(e) => { setEntidad(e.target.value); setPagina(0); }}>
          <option value="">Todo</option>
          {Object.entries(ENTIDAD).map(([v, t]) => (
            <option key={v} value={v}>
              {t}
            </option>
          ))}
        </select>
        <input type="date" value={desde} onChange={(e) => { setDesde(e.target.value); setPagina(0); }} />
        <input type="date" value={hasta} onChange={(e) => { setHasta(e.target.value); setPagina(0); }} />
        <button
          className="btn-mini"
          type="button"
          onClick={() =>
            void api
              .get<{ csv: string; filas: number }>(
                `/auditoria/exportar?${new URLSearchParams({ ...(desde && { desde }), ...(hasta && { hasta }) })}`,
              )
              .then((r) => {
                // La exportación se registra en la propia auditoría: es la
                // acción con la que los datos salen del sistema.
                const url = URL.createObjectURL(new Blob([r.csv], { type: 'text/csv;charset=utf-8' }));
                const a = document.createElement('a');
                a.href = url;
                a.download = `auditoria-${new Date().toISOString().slice(0, 10)}.csv`;
                a.click();
                URL.revokeObjectURL(url);
              })
              .catch((e: Error) => setError(e.message))
          }
        >
          Exportar CSV
        </button>
      </div>

      <p className="tenue" style={{ marginTop: 12, fontSize: '0.85rem' }}>
        {datos?.total ?? '—'} registros
        {paginas > 1 && ` · página ${pagina + 1} de ${paginas}`}
      </p>

      <table className="tabla" style={{ marginTop: 10 }}>
        <thead>
          <tr>
            <th style={{ width: 165 }}>Cuándo</th>
            <th style={{ width: 190 }}>Quién</th>
            <th style={{ width: 140 }}>Qué hizo</th>
            <th>Sobre</th>
            <th style={{ width: 130 }}>Desde</th>
          </tr>
        </thead>
        <tbody>
          {datos?.filas.map((f) => {
            const a = ACCION[f.action] ?? { texto: f.action, clase: 'planeado' };
            return (
              <tr key={f.id}>
                <td className="tenue" style={{ fontSize: '0.8rem' }}>
                  {cuando(f.createdAt)}
                </td>
                <td>
                  {f.user ? (
                    <>
                      {f.user.firstName} {f.user.lastName}
                      <div className="tenue" style={{ fontSize: '0.75rem' }}>
                        {f.user.email}
                      </div>
                    </>
                  ) : (
                    <span className="tenue">sistema</span>
                  )}
                </td>
                <td>
                  <em className={`estado ${a.clase}`}>{a.texto}</em>
                </td>
                <td className="tenue" style={{ fontSize: '0.85rem' }}>
                  {ENTIDAD[f.entityType] ?? f.entityType}
                  {f.person && <> · <b style={{ color: 'var(--fg)' }}>{f.person.displayName}</b></>}
                  {Boolean(f.newValues) && (
                    <div style={{ fontSize: '0.76rem', fontFamily: 'ui-monospace, monospace' }}>
                      {JSON.stringify(f.newValues).slice(0, 90)}
                    </div>
                  )}
                </td>
                <td className="tenue" style={{ fontSize: '0.78rem' }}>
                  {f.ipAddress?.replace('::ffff:', '') ?? '—'}
                </td>
              </tr>
            );
          })}
          {datos?.filas.length === 0 && (
            <tr>
              <td colSpan={5} className="tenue">
                Sin registros con esos filtros.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {paginas > 1 && (
        <div className="acciones" style={{ marginTop: 14 }}>
          <button className="btn-mini" type="button" disabled={pagina === 0} onClick={() => setPagina((p) => p - 1)}>
            ← Anterior
          </button>
          <button
            className="btn-mini"
            type="button"
            disabled={pagina + 1 >= paginas}
            onClick={() => setPagina((p) => p + 1)}
          >
            Siguiente →
          </button>
        </div>
      )}

      <p className="aviso">
        Navegar esta pantalla no se registra: produciría ruido infinito, porque cada consulta
        generaría la fila que la siguiente encuentra. Lo que sí queda registrado es la{' '}
        <b>exportación</b>, que es la acción con la que los datos salen del sistema.
      </p>
    </>
  );
}
