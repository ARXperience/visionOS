'use client';

import { useCallback, useEffect, useState } from 'react';

import { useSesion } from '../../components/marco';
import { api } from '../../lib/api';

interface Usuario {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: string;
  status: string;
  crossSitePatientRead: boolean;
  lastLoginAt: string | null;
  siteAccess: { site: { id: string; code: string }; isPrimary: boolean }[];
}

interface Rol {
  role: string;
  permisos: number;
  detalle: string[];
}

interface Sede {
  id: string;
  code: string;
  name: string;
}

const CLAVE_MINIMA = 12;

const NOMBRE_ROL: Record<string, string> = {
  SUPERADMIN: 'Administrador general',
  ADMIN_SEDE: 'Administrador de sede',
  COORDINACION: 'Coordinación',
  RECEPCION: 'Recepción',
  AGENDAMIENTO: 'Agendamiento',
  CALL_CENTER: 'Call center',
  PROFESIONAL: 'Profesional',
  FACTURACION: 'Facturación',
  AUDITOR: 'Auditoría',
};

export default function Usuarios() {
  const sesion = useSesion();
  const [usuarios, setUsuarios] = useState<Usuario[] | null>(null);
  const [roles, setRoles] = useState<Rol[]>([]);
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [creando, setCreando] = useState(false);
  const [cambiandoClave, setCambiandoClave] = useState<Usuario | null>(null);
  const [verRol, setVerRol] = useState<Rol | null>(null);

  const cargar = useCallback(
    () =>
      api
        .get<Usuario[]>('/usuarios')
        .then(setUsuarios)
        .catch((e: Error) => setError(e.message)),
    [],
  );

  useEffect(() => {
    void cargar();
    void api.get<Rol[]>('/usuarios/roles').then(setRoles).catch(() => undefined);
    void api.get<Sede[]>('/catalogo/sedes').then(setSedes).catch(() => undefined);
  }, [cargar]);

  const puedeGestionar = sesion.permissions.includes('user.manage');

  async function accion(fn: () => Promise<unknown>, mensaje: string) {
    setError(null);
    setAviso(null);
    try {
      await fn();
      setAviso(mensaje);
      await cargar();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <>
      <span className="miga">Sistema</span>
      <h1>Usuarios y permisos</h1>
      <p className="sub">
        Nueve roles con permisos por acción y acceso por sede. Cada cambio queda registrado en la
        auditoría con quién lo hizo.
      </p>

      {error && <p className="error" role="alert">{error}</p>}
      {aviso && <p className="ok" role="status">{aviso}</p>}

      {puedeGestionar && (
        <div className="filtros">
          <button className="btn-mini" type="button" onClick={() => setCreando(true)}>
            Crear usuario
          </button>
        </div>
      )}

      {creando && (
        <Crear
          roles={roles}
          sedes={sedes}
          alCerrar={() => setCreando(false)}
          alCrear={() => {
            setCreando(false);
            setAviso('Usuario creado.');
            void cargar();
          }}
        />
      )}

      {cambiandoClave && (
        <CambiarClave
          usuario={cambiandoClave}
          alCerrar={() => setCambiandoClave(null)}
          alCambiar={() => {
            setCambiandoClave(null);
            setAviso('Contraseña cambiada. Se cerraron todas sus sesiones abiertas.');
          }}
        />
      )}

      <table className="tabla" style={{ marginTop: 22 }}>
        <thead>
          <tr>
            <th>Persona</th>
            <th style={{ width: 200 }}>Rol</th>
            <th style={{ width: 130 }}>Sedes</th>
            <th style={{ width: 130 }}>Último acceso</th>
            <th style={{ width: 110 }}>Estado</th>
            {puedeGestionar && <th style={{ width: 230 }} />}
          </tr>
        </thead>
        <tbody>
          {usuarios?.map((u) => {
            const yo = u.id === sesion.id;
            return (
              <tr key={u.id}>
                <td>
                  <b>
                    {u.firstName} {u.lastName}
                  </b>
                  {yo && <span className="pill">usted</span>}
                  <div className="tenue" style={{ fontSize: '0.79rem' }}>
                    {u.email}
                  </div>
                </td>
                <td>
                  <button
                    type="button"
                    className="enlace-rol"
                    onClick={() => setVerRol(roles.find((r) => r.role === u.role) ?? null)}
                    title="Ver qué permite este rol"
                  >
                    {NOMBRE_ROL[u.role] ?? u.role}
                  </button>
                  {u.crossSitePatientRead && (
                    <div className="tenue" style={{ fontSize: '0.75rem' }}>
                      ve pacientes de todas las sedes
                    </div>
                  )}
                </td>
                <td className="tenue">
                  {u.siteAccess.map((s) => s.site.code).join(', ') || '—'}
                </td>
                <td className="tenue" style={{ fontSize: '0.8rem' }}>
                  {u.lastLoginAt
                    ? new Date(u.lastLoginAt).toLocaleDateString('es-CO', {
                        day: 'numeric',
                        month: 'short',
                      })
                    : 'nunca'}
                </td>
                <td>
                  <em className={`estado ${u.status === 'ACTIVE' ? 'disponible' : 'planeado'}`}>
                    {u.status === 'ACTIVE' ? 'Activo' : 'Suspendido'}
                  </em>
                </td>
                {puedeGestionar && (
                  <td>
                    <div className="acciones">
                      <button className="btn-mini" type="button" onClick={() => setCambiandoClave(u)}>
                        Contraseña
                      </button>
                      {!yo && (
                        <button
                          className="btn-mini"
                          type="button"
                          onClick={() =>
                            void accion(
                              () =>
                                api.post(`/usuarios/${u.id}/estado`, {
                                  activo: u.status !== 'ACTIVE',
                                }),
                              u.status === 'ACTIVE' ? 'Cuenta suspendida.' : 'Cuenta reactivada.',
                            )
                          }
                        >
                          {u.status === 'ACTIVE' ? 'Suspender' : 'Reactivar'}
                        </button>
                      )}
                      {!yo && (
                        <button
                          className="btn-mini peligro"
                          type="button"
                          title="Deja de poder entrar y desaparece de la lista. Su rastro en la auditoría se conserva."
                          onClick={() => {
                            if (
                              !confirm(
                                `¿Dar de baja a ${u.firstName} ${u.lastName}?\n\n` +
                                  'Dejará de poder entrar y desaparecerá de esta lista. Su rastro ' +
                                  'en la auditoría se conserva: no se borra de la base.',
                              )
                            )
                              return;
                            void accion(() => baja(u.id), 'Usuario dado de baja.');
                          }}
                        >
                          Dar de baja
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>

      {verRol && (
        <div className="panel-agendar" style={{ marginTop: 22 }}>
          <h2 style={{ fontSize: '1.05rem' }}>
            {NOMBRE_ROL[verRol.role] ?? verRol.role}{' '}
            <span className="tenue">— {verRol.permisos} permisos</span>
          </h2>
          <p className="tenue" style={{ fontSize: '0.85rem', margin: '8px 0 12px' }}>
            Lo que este rol permite hacer. Un permiso que no está en la lista, no se tiene.
          </p>
          <div className="permisos">
            {verRol.detalle.map((p) => (
              <span key={p} className="pill gris">
                {p}
              </span>
            ))}
          </div>
          <button className="btn-mini" type="button" style={{ marginTop: 14 }} onClick={() => setVerRol(null)}>
            Cerrar
          </button>
        </div>
      )}
    </>
  );
}

/** DELETE no cabe en el ayudante `api`; se hace directo. */
async function baja(id: string) {
  const r = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? '/api'}/usuarios/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!r.ok) throw new Error(((await r.json()) as { message?: string }).message ?? 'Error');
}

function Crear({
  roles,
  sedes,
  alCerrar,
  alCrear,
}: {
  roles: Rol[];
  sedes: Sede[];
  alCerrar: () => void;
  alCrear: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [siteIds, setSiteIds] = useState<string[]>([]);

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    const d = new FormData(e.currentTarget);
    try {
      await api.post('/usuarios', {
        email: String(d.get('email')),
        password: String(d.get('password')),
        firstName: String(d.get('firstName')),
        lastName: String(d.get('lastName')),
        phone: String(d.get('phone') || '') || undefined,
        role: String(d.get('role')),
        siteIds,
        crossSitePatientRead: d.get('cross') === 'on',
      });
      alCrear();
    } catch (x) {
      setError((x as Error).message);
      setEnviando(false);
    }
  }

  return (
    <form className="panel-agendar" onSubmit={enviar}>
      <h2 style={{ fontSize: '1.05rem', marginBottom: 14 }}>Crear usuario</h2>

      <div className="rejilla-form">
        <label>
          Nombre
          <input name="firstName" required minLength={2} maxLength={60} />
        </label>
        <label>
          Apellido
          <input name="lastName" required minLength={2} maxLength={60} />
        </label>
        <label>
          Correo
          <input name="email" type="email" required autoComplete="off" />
        </label>
        <label>
          Teléfono
          <input name="phone" maxLength={20} />
        </label>
        <label>
          Contraseña
          <input
            name="password"
            type="text"
            required
            minLength={CLAVE_MINIMA}
            autoComplete="new-password"
            placeholder={`mínimo ${CLAVE_MINIMA} caracteres`}
          />
        </label>
        <label>
          Rol
          <select name="role" required defaultValue="RECEPCION">
            {roles.map((r) => (
              <option key={r.role} value={r.role}>
                {NOMBRE_ROL[r.role] ?? r.role} ({r.permisos})
              </option>
            ))}
          </select>
        </label>
      </div>

      <p className="tenue" style={{ fontSize: '0.83rem', margin: '4px 0 10px' }}>
        La contraseña se muestra en claro a propósito: hay que dictársela a la persona. Que la
        cambie al entrar.
      </p>

      <fieldset className="sedes-check">
        <legend>Sedes a las que accede</legend>
        {sedes.map((s) => (
          <label key={s.id}>
            <input
              type="checkbox"
              checked={siteIds.includes(s.id)}
              onChange={(e) =>
                setSiteIds((v) => (e.target.checked ? [...v, s.id] : v.filter((x) => x !== s.id)))
              }
            />
            {s.name}
          </label>
        ))}
        <p className="tenue" style={{ fontSize: '0.8rem', margin: '6px 0 0' }}>
          Sin sede, la cuenta entra pero no ve ninguna agenda.
        </p>
      </fieldset>

      <label className="interno" style={{ marginTop: 10 }}>
        <input type="checkbox" name="cross" />
        Puede ver pacientes de todas las sedes
      </label>

      {error && <p className="error" role="alert">{error}</p>}

      <div className="acciones" style={{ marginTop: 16 }}>
        <button className="btn-mini" type="submit" disabled={enviando || !siteIds.length}>
          {enviando ? 'Creando…' : 'Crear'}
        </button>
        <button className="btn-mini" type="button" onClick={alCerrar}>
          Cancelar
        </button>
      </div>
    </form>
  );
}

function CambiarClave({
  usuario,
  alCerrar,
  alCambiar,
}: {
  usuario: Usuario;
  alCerrar: () => void;
  alCambiar: () => void;
}) {
  const [clave, setClave] = useState('');
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="panel-agendar">
      <h2 style={{ fontSize: '1.05rem' }}>
        Contraseña de {usuario.firstName} {usuario.lastName}
      </h2>
      <p className="tenue" style={{ fontSize: '0.85rem', margin: '8px 0 12px' }}>
        Al cambiarla se cierran todas sus sesiones abiertas. Es el motivo por el que se cambia una
        contraseña: si alguien la tenía, su sesión seguiría viva.
      </p>

      <div className="fila-agendar">
        <input
          value={clave}
          onChange={(e) => setClave(e.target.value)}
          placeholder={`Nueva contraseña — mínimo ${CLAVE_MINIMA} caracteres`}
          minLength={CLAVE_MINIMA}
          style={{ minWidth: 340 }}
        />
        <button
          className="btn-mini"
          type="button"
          disabled={clave.length < CLAVE_MINIMA}
          onClick={() =>
            void api
              .post(`/usuarios/${usuario.id}/clave`, { password: clave })
              .then(alCambiar)
              .catch((e: Error) => setError(e.message))
          }
        >
          Cambiar
        </button>
        <button className="btn-mini" type="button" onClick={alCerrar}>
          Cancelar
        </button>
      </div>

      {error && <p className="error" role="alert">{error}</p>}
    </div>
  );
}
