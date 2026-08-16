/**
 * Cliente de la API.
 *
 * El access token vive SOLO en memoria de este módulo: nunca en localStorage
 * ni en sessionStorage, que cualquier XSS puede leer. Lo que sobrevive a un
 * refresco de página es la cookie httpOnly del refresh token, que el
 * navegador manda solo y el JavaScript no puede tocar. Al cargar, `recuperar()`
 * la canjea por un access token nuevo.
 *
 * La base de la API es configurable. En local todo sale del mismo origen
 * (`/api/...`) gracias al proxy; en producción el panel vive en Vercel y la
 * API en Hostinger, así que hay que apuntar al dominio completo.
 *
 * `credentials: 'include'` y no 'same-origin': la cookie del refresh tiene
 * que viajar a otro subdominio. Para que llegue, la API la emite con
 * `domain=.visioncolombia.com.co` y ambos cuelgan de ahí.
 */
const BASE = process.env.NEXT_PUBLIC_API_URL ?? '/api';
export interface Sesion {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  permissions: string[];
  siteIds?: string[];
  primarySiteId?: string | null;
}

let accessToken: string | null = null;

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

async function pedir<T>(ruta: string, init: RequestInit = {}, reintentar = true): Promise<T> {
  const res = await fetch(`${BASE}${ruta}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
      ...init.headers,
    },
    // Sin esto la cookie del refresh no viaja. 'include' y no 'same-origin'
    // porque la API está en otro subdominio.
    credentials: 'include',
  });

  // Un 401 con sesión previa suele ser el access token vencido (15 min), no
  // una sesión caída: se renueva una vez y se reintenta. Solo una, o dos
  // pestañas con la sesión muerta se llaman en bucle.
  if (res.status === 401 && reintentar && accessToken) {
    accessToken = null;
    if (await recuperar()) return pedir<T>(ruta, init, false);
  }

  if (!res.ok) {
    const cuerpo = (await res.json().catch(() => null)) as { message?: string | string[] } | null;
    const msg = Array.isArray(cuerpo?.message) ? cuerpo.message.join('. ') : cuerpo?.message;
    throw new ApiError(res.status, msg ?? `Error ${res.status}`);
  }

  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

export async function entrar(email: string, password: string): Promise<Sesion> {
  const r = await pedir<{ accessToken: string; user: Sesion }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  accessToken = r.accessToken;
  return r.user;
}

/** Canjea la cookie por un access token. Devuelve null si no hay sesión. */
export async function recuperar(): Promise<Sesion | null> {
  try {
    const r = await pedir<{ accessToken: string; user: Sesion }>(
      '/auth/refresh',
      { method: 'POST' },
      false,
    );
    accessToken = r.accessToken;
    return r.user;
  } catch {
    accessToken = null;
    return null;
  }
}

export async function salir(): Promise<void> {
  await pedir<void>('/auth/logout', { method: 'POST' }).catch(() => undefined);
  accessToken = null;
}

export const api = {
  get: <T>(ruta: string) => pedir<T>(ruta),
  post: <T>(ruta: string, cuerpo?: unknown) =>
    pedir<T>(ruta, { method: 'POST', body: cuerpo ? JSON.stringify(cuerpo) : undefined }),
  patch: <T>(ruta: string, cuerpo: unknown) =>
    pedir<T>(ruta, { method: 'PATCH', body: JSON.stringify(cuerpo) }),
  // DELETE pasa por el mismo `pedir` a propósito: un fetch suelto no lleva
  // la cabecera Authorization —la cookie es solo del refresh— y devolvería
  // 401 sin que se entienda por qué.
  del: <T>(ruta: string) => pedir<T>(ruta, { method: 'DELETE' }),
};
