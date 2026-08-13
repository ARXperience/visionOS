'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { type ReactNode, createContext, useContext, useEffect, useState } from 'react';

import { ETIQUETA_ESTADO, GRUPOS, MODULOS } from '../lib/modulos';
import { type Sesion, recuperar, salir } from '../lib/api';
import { Acceso } from './acceso';
import { Icono } from './icono';
import { Marca } from './marca';

const Ctx = createContext<Sesion | null>(null);

/** La sesión, para cualquier pantalla que la necesite. */
export const useSesion = () => {
  const s = useContext(Ctx);
  if (!s) throw new Error('useSesion fuera del marco autenticado');
  return s;
};

export function Marco({ children }: { children: ReactNode }) {
  const [sesion, setSesion] = useState<Sesion | null>(null);
  // Tercer estado a propósito: sin él, el login parpadea en cada recarga
  // antes de que llegue la respuesta del refresh.
  const [comprobando, setComprobando] = useState(true);
  const ruta = usePathname();

  useEffect(() => {
    recuperar()
      .then(setSesion)
      .finally(() => setComprobando(false));
  }, []);

  if (comprobando) return <main className="acceso" aria-busy="true" />;
  if (!sesion) return <Acceso alEntrar={setSesion} />;

  const puede = (permiso?: string) => !permiso || sesion.permissions.includes(permiso);
  const actual = (ruta ?? '/').replace(/^\/admin/, '') || '/';

  return (
    <Ctx.Provider value={sesion}>
      <div className="marco">
        <aside className="lateral">
          <div className="lateral-marca">
            <Marca claro />
          </div>

          <nav>
            {GRUPOS.map((grupo) => {
              const items = MODULOS.filter((m) => m.grupo === grupo && puede(m.permiso));
              if (!items.length) return null;

              return (
                <div className="grupo" key={grupo}>
                  <h3>{grupo}</h3>
                  {items.map((m) => {
                    const destino = m.id ? `/${m.id}` : '/';
                    return (
                      <Link
                        key={m.id || 'inicio'}
                        href={destino}
                        className={`enlace ${actual === destino ? 'activo' : ''} e-${m.estado}`}
                        aria-current={actual === destino ? 'page' : undefined}
                      >
                        <Icono nombre={m.icono} />
                        <span>{m.nombre}</span>
                        {m.estado !== 'disponible' && (
                          <em title={ETIQUETA_ESTADO[m.estado]}>
                            {m.estado === 'construccion' ? '◐' : '○'}
                          </em>
                        )}
                      </Link>
                    );
                  })}
                </div>
              );
            })}
          </nav>

          <div className="lateral-pie">
            <span>◐ en construcción · ○ planeado</span>
          </div>
        </aside>

        <div className="panel">
          <header className="cabecera">
            <div className="quien">
              <b>
                {sesion.firstName} {sesion.lastName}
              </b>
              <span>{sesion.role.replace('_', ' ').toLowerCase()}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                void salir().then(() => setSesion(null));
              }}
            >
              <Icono nombre="salir" tam={16} />
              Salir
            </button>
          </header>

          <main className="contenido">{children}</main>
        </div>
      </div>
    </Ctx.Provider>
  );
}
