'use client';

import { useState } from 'react';

import { type Sesion, entrar } from '../lib/api';
import { Marca } from './marca';

export function Acceso({ alEntrar }: { alEntrar: (s: Sesion) => void }) {
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setEnviando(true);
    setError(null);

    const datos = new FormData(e.currentTarget);
    try {
      alEntrar(await entrar(String(datos.get('email') ?? ''), String(datos.get('password') ?? '')));
    } catch (err) {
      // Mensaje único a propósito: distinguir "no existe" de "clave
      // incorrecta" convierte el formulario en un detector de correos
      // válidos del personal.
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
