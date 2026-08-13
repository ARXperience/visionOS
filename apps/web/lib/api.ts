/**
 * Cliente de la API.
 *
 * El access token vive SOLO en memoria de este módulo: nunca en localStorage
 * ni en sessionStorage, que cualquier XSS puede leer. Lo que sobrevive a un
 * refresco de página es la cookie httpOnly del refresh token, que el
 * navegador manda solo y el JavaScript no puede tocar. Al cargar, `recuperar()`
 * la canjea por un access token nuevo.
 *
 * Todo va al mismo origen (`/api/...`), así que no hay CORS ni configuración
 * de dominio que mantener.
 */
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
  const res = await fetch(`/api${ruta}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
      ...init.headers,
    },
    // Sin esto la cookie del refresh no viaja.
    credentials: 'same-origin',
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
};
