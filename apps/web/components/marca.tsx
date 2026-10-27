/**
 * El ojo del sitio público, para que el panel no parezca otra empresa.
 *
 * El trazo va en `currentColor` y no en un azul fijo: sobre la barra oscura
 * hereda el blanco y sobre la tarjeta clara hereda la tinta. Con un hex
 * fijo, el mismo ojo desaparecía en el tema oscuro y solo quedaba el iris.
 */
export function Marca() {
  return (
    <span className="marca">
      <svg viewBox="0 0 32 32" width="28" height="28" fill="none" aria-hidden="true">
        <path
          d="M2 16s5.6-9.6 14-9.6S30 16 30 16s-5.6 9.6-14 9.6S2 16 2 16Z"
          stroke="currentColor"
          strokeWidth="2.1"
        />
        <circle cx="16" cy="16" r="5.6" fill="#0E93B4" />
        <circle cx="16" cy="16" r="2.4" fill="#071A36" />
        <circle cx="18.1" cy="13.7" r="1.15" fill="#fff" />
      </svg>
      <span>
        <b>VISIÓN COLOMBIA</b> <i>OS</i>
      </span>
    </span>
  );
}
