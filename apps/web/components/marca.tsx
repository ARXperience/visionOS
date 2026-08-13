/** El ojo del sitio público, para que el panel no parezca otra empresa. */
export function Marca({ claro = false }: { claro?: boolean }) {
  const trazo = claro ? '#fff' : '#0A2452';
  const pupila = claro ? '#071A36' : '#0A2452';

  return (
    <span className="marca">
      <svg viewBox="0 0 32 32" width="28" height="28" fill="none" aria-hidden="true">
        <path
          d="M2 16s5.6-9.6 14-9.6S30 16 30 16s-5.6 9.6-14 9.6S2 16 2 16Z"
          stroke={trazo}
          strokeWidth="2.1"
        />
        <circle cx="16" cy="16" r="5.6" fill="#0E93B4" />
        <circle cx="16" cy="16" r="2.4" fill={pupila} />
        <circle cx="18.1" cy="13.7" r="1.15" fill="#fff" />
      </svg>
      <span>
        <b>VISIÓN COLOMBIA</b> <i>OS</i>
      </span>
    </span>
  );
}
