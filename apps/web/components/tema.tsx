'use client';

/**
 * Interruptor de tema claro/oscuro.
 *
 * La preferencia se guarda en `localStorage` bajo la misma clave que usa el
 * sitio público. En producción los dos cuelgan del mismo origen
 * (visioncolombia.com.co y /admin), así que quien elige oscuro en la web
 * entra al panel y lo encuentra oscuro. No hace falta nada más para eso.
 *
 * El botón no guarda estado en React: el estado vive en el atributo del
 * <html> y el CSS decide qué icono se ve. Renderizar el icono desde React
 * obligaría a leer localStorage en el cliente y produciría una discrepancia
 * de hidratación en el primer pintado.
 */
export function Tema() {
  return (
    <button
      className="tema"
      type="button"
      aria-label="Cambiar entre tema claro y oscuro"
      title="Cambiar tema"
      onClick={() => {
        const raiz = document.documentElement;
        const actual =
          raiz.dataset.tema ??
          (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'oscuro' : 'claro');
        const nuevo = actual === 'oscuro' ? 'claro' : 'oscuro';
        raiz.dataset.tema = nuevo;
        try {
          localStorage.setItem('tema', nuevo);
        } catch {
          /* Ventana privada: el tema dura lo que dure la pestaña. */
        }
      }}
    >
      <svg
        className="sol"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="4.2" />
        <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.2 5.2l1.4 1.4M17.4 17.4l1.4 1.4M18.8 5.2l-1.4 1.4M6.6 17.4l-1.4 1.4" />
      </svg>
      <svg
        className="luna"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" />
      </svg>
    </button>
  );
}
