'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';

import { Icono } from '../../components/icono';
import { ETIQUETA_ESTADO, moduloPorId } from '../../lib/modulos';

/**
 * Todo módulo aún no construido cae aquí.
 *
 * No hay pantallas de mentira ni datos de demostración: en una clínica,
 * alguien usa la pantalla que parece funcionar, cree que agendó, y el
 * paciente llega a una cita que no existe. Esta pantalla dice qué hará el
 * módulo y cuándo, que es toda la verdad disponible.
 */
export default function ModuloPendiente() {
  const { modulo } = useParams<{ modulo: string }>();
  const m = moduloPorId(modulo);

  if (!m) {
    return (
      <>
        <h1>No existe</h1>
        <p className="sub">Esa sección no forma parte del sistema.</p>
        <Link href="/" className="volver">
          ← Volver al centro de control
        </Link>
      </>
    );
  }

  return (
    <>
      <span className="miga">{m.grupo}</span>
      <h1 style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Icono nombre={m.icono} tam={26} />
        {m.nombre}
      </h1>

      <div className={`pendiente e-${m.estado}`}>
        <p className="pendiente-estado">
          <em className={`estado ${m.estado}`}>{ETIQUETA_ESTADO[m.estado]}</em>
          {m.entrega ? (
            <span>Llega en la entrega {m.entrega}.</span>
          ) : (
            <span>Fuera del alcance de la fase 1.</span>
          )}
        </p>

        <p className="pendiente-resumen">{m.resumen}</p>

        <p className="pendiente-nota">
          Esta pantalla no muestra datos de ejemplo a propósito. Un módulo que aparenta funcionar
          es peor que uno que no existe: alguien lo usaría, creería haber registrado algo, y no
          habría nada.
        </p>

        <Link href="/" className="volver">
          ← Volver al centro de control
        </Link>
      </div>
    </>
  );
}
