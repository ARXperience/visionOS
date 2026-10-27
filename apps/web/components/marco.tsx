'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

import { ETIQUETA_ESTADO, GRUPOS, MODULOS } from '../lib/modulos';
import { type Sesion, recuperar, salir } from '../lib/api';
import { Acceso } from './acceso';
import { Icono } from './icono';
import { Marca } from './marca';
import { Tema } from './tema';

const Ctx = createContext<Sesion | null>(null);
const VIDEOS_FONDO = ['/admin/nebula-01.mp4', '/admin/nebula-02.mp4'] as const;
const DURACION_FUSION_MS = 1_800;
const ANTICIPACION_FUSION_S = 2.1;

function FondoNebula() {
  const primero = useRef<HTMLVideoElement>(null);
  const segundo = useRef<HTMLVideoElement>(null);
  const fusionando = useRef(false);
  const temporizador = useRef<number | null>(null);
  const [activo, setActivo] = useState(0);

  const fundir = useCallback(
    (desde: number) => {
      if (desde !== activo || fusionando.current) return;

      const videos = [primero.current, segundo.current];
      const siguiente = activo === 0 ? 1 : 0;
      const entrante = videos[siguiente];
      const saliente = videos[activo];
      if (!entrante || !saliente) return;

      fusionando.current = true;
      entrante.currentTime = 0;
      void entrante
        .play()
        .then(() => {
          setActivo(siguiente);
          temporizador.current = window.setTimeout(() => {
            saliente.pause();
            fusionando.current = false;
          }, DURACION_FUSION_MS);
        })
        .catch(() => {
          fusionando.current = false;
        });
    },
    [activo],
  );

  useEffect(
    () => () => {
      if (temporizador.current !== null) window.clearTimeout(temporizador.current);
    },
    [],
  );

  return (
    <div className="fondo-nebula" aria-hidden="true">
      {VIDEOS_FONDO.map((src, indice) => (
        <video
          key={src}
          ref={indice === 0 ? primero : segundo}
          className={`fondo-video ${activo === indice ? 'activo' : ''}`}
          autoPlay={indice === 0}
          muted
          playsInline
          preload="auto"
          onTimeUpdate={(evento) => {
            const video = evento.currentTarget;
            if (
              video.duration > 0 &&
              video.duration - video.currentTime <= ANTICIPACION_FUSION_S
            ) {
              fundir(indice);
            }
          }}
          onEnded={() => fundir(indice)}
        >
          <source src={src} type="video/mp4" />
        </video>
      ))}
      <span className="fondo-video-velo" />
    </div>
  );
}

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
  const moduloActual = MODULOS.find((m) => (m.id ? `/${m.id}` : '/') === actual);
  const iniciales = `${sesion.firstName[0] ?? ''}${sesion.lastName[0] ?? ''}`.toUpperCase();

  return (
    <Ctx.Provider value={sesion}>
      <div className="marco">
        <FondoNebula />

        <aside className="lateral">
          <div className="lateral-marca">
            <Marca />
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
            <div className="cabecera-context">
              <span>Vision OS</span>
              <b>{moduloActual?.nombre ?? 'Centro de control'}</b>
            </div>
            <div className="cabecera-acciones">
              <div className="quien">
                <span className="avatar" aria-hidden="true">
                  {iniciales}
                </span>
                <span>
                  <b>
                    {sesion.firstName} {sesion.lastName}
                  </b>
                  <small>{sesion.role.replace('_', ' ').toLowerCase()}</small>
                </span>
              </div>
              <Tema />
              <button
                className="salir"
                type="button"
                onClick={() => {
                  void salir().then(() => setSesion(null));
                }}
              >
                <Icono nombre="salir" tam={16} />
                <span>Salir</span>
              </button>
            </div>
          </header>

          <main className="contenido">{children}</main>
        </div>
      </div>
    </Ctx.Provider>
  );
}
