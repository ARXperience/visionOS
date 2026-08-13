'use client';

import { useEffect, useState } from 'react';

import { Marca } from '../components/marca';
import { Panel } from '../components/panel';
import { type Sesion, entrar, recuperar } from '../lib/api';

export default function Admin() {
  const [sesion, setSesion] = useState<Sesion | null>(null);
  // `null` mientras se comprueba si hay sesión: sin este tercer estado, el
  // login parpadea en cada recarga antes de que llegue el refresh.
  const [comprobando, setComprobando] = useState(true);

  useEffect(() => {
    recuperar()
      .then(setSesion)
      .finally(() => setComprobando(false));
  }, []);

  if (comprobando) return <main className="acceso" aria-busy="true" />;
  if (sesion) return <Panel sesion={sesion} alSalir={() => setSesion(null)} />;
  return <Acceso alEntrar={setSesion} />;
}

function Acceso({ alEntrar }: { alEntrar: (s: Sesion) => void }) {
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setEnviando(true);
    setError(null);

    const datos = new FormData(e.currentTarget);
    try {
      alEntrar(
        await entrar(String(datos.get('email') ?? ''), String(datos.get('password') ?? '')),
      );
    } catch (err) {
      // Mensaje único: no se distingue "no existe" de "clave incorrecta",
      // o el formulario se convierte en un detector de correos válidos.
      setError(
        (err as { status?: number }).status === 401
          ? 'Correo o contraseña incorrectos.'
          : 'No se pudo conectar con el sistema. Intente de nuevo.',
      );
      setEnviando(false);
    }
  }

  return (
    <main className="acceso">
      <form className="tarjeta" onSubmit={enviar}>
        <Marca />
        <h1 style={{ fontSize: '1.35rem', marginBottom: 6 }}>Sistema administrativo</h1>
        <p style={{ color: 'var(--mute)', fontSize: '0.9rem', margin: '0 0 26px' }}>
          Acceso restringido al personal de la clínica.
        </p>

        <div className="campo">
          <label htmlFor="email">Correo</label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="username"
            autoFocus
            placeholder="nombre@visioncolombia.com.co"
          />
        </div>

        <div className="campo">
          <label htmlFor="password">Contraseña</label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            minLength={8}
          />
        </div>

        <button className="btn" type="submit" disabled={enviando}>
          {enviando ? 'Verificando…' : 'Entrar'}
        </button>

        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}

        <p className="pie">
          Cada acceso queda registrado. Si olvidó su contraseña, solicítela a la administración.
        </p>
      </form>
    </main>
  );
}
