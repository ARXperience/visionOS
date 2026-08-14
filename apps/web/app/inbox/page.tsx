'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { Icono } from '../../components/icono';
import { useSesion } from '../../components/marco';
import { api } from '../../lib/api';

interface Resumen {
  id: string;
  contactName: string | null;
  phoneNumber: string | null;
  status: string;
  aiEnabled: boolean;
  unreadCount: number;
  lastMessageAt: string | null;
  lastMessageText: string | null;
  person: { id: string; displayName: string; isPatient: boolean } | null;
  assignedTo: { id: string; firstName: string; lastName: string } | null;
  site: { id: string; code: string } | null;
}

interface Mensaje {
  id: string;
  direction: 'ENTRANTE' | 'SALIENTE';
  author: string;
  type: string;
  status: string;
  body: string | null;
  isInternal: boolean;
  createdAt: string;
  error: string | null;
  sentBy: { firstName: string; lastName: string } | null;
}

interface Detalle extends Resumen {
  messages: Mensaje[];
}

/**
 * Se refresca por sondeo cada 3 segundos, no por WebSocket.
 *
 * El criterio de la entrega es que un mensaje aparezca en menos de 3
 * segundos, y para una decena de personas eso lo cumple una consulta
 * pequeña cada 3s sin añadir Socket.IO, su reconexión y su estado. Cuando
 * la clínica tenga suficientes usuarios como para que se note, el sitio
 * donde cambiarlo es este hook y nada más.
 *
 * ponytail: sondeo cada 3s; pasar a WebSocket si la carga lo justifica.
 */
const CADA_MS = 3000;

export default function Inbox() {
  const sesion = useSesion();
  const [lista, setLista] = useState<Resumen[] | null>(null);
  const [abierta, setAbierta] = useState<string | null>(null);
  const [detalle, setDetalle] = useState<Detalle | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cargarLista = useCallback(
    () =>
      api
        .get<Resumen[]>('/conversaciones')
        .then(setLista)
        .catch((e: Error) => setError(e.message)),
    [],
  );

  const cargarDetalle = useCallback((id: string) => {
    return api
      .get<Detalle>(`/conversaciones/${id}`)
      .then(setDetalle)
      .catch((e: Error) => setError(e.message));
  }, []);

  useEffect(() => {
    void cargarLista();
    const t = setInterval(() => void cargarLista(), CADA_MS);
    return () => clearInterval(t);
  }, [cargarLista]);

  useEffect(() => {
    if (!abierta) return;
    void cargarDetalle(abierta).then(() => api.post(`/conversaciones/${abierta}/leido`));
    const t = setInterval(() => void cargarDetalle(abierta), CADA_MS);
    return () => clearInterval(t);
  }, [abierta, cargarDetalle]);

  const puedeEscribir = sesion.permissions.includes('conversation.write');

  return (
    <>
      <span className="miga">Operación</span>
      <h1>Inbox</h1>
      <p className="sub">
        {lista?.length ?? '—'} conversaciones. Se actualiza solo cada {CADA_MS / 1000} segundos.
      </p>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <div className="bandeja">
        <ul className="chats">
          {lista?.length === 0 && (
            <li className="vacio">
              Todavía no ha entrado ninguna conversación. Vincule una línea en{' '}
              <a href="/admin/canales">Líneas de WhatsApp</a>.
            </li>
          )}
          {lista?.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                className={`chat ${abierta === c.id ? 'activo' : ''}`}
                onClick={() => setAbierta(c.id)}
              >
                <span className="chat-cab">
                  <b>{c.person?.displayName ?? c.contactName ?? c.phoneNumber}</b>
                  {c.unreadCount > 0 && <em className="sinleer">{c.unreadCount}</em>}
                </span>
                <span className="chat-txt">{c.lastMessageText ?? 'Sin mensajes'}</span>
                <span className="chat-pie">
                  {c.person?.isPatient ? (
                    <i className="pill">paciente</i>
                  ) : (
                    <i className="pill gris">contacto</i>
                  )}
                  {c.site && <i className="pill gris">{c.site.code}</i>}
                  {!c.aiEnabled && <i className="pill gris">IA en pausa</i>}
                  {c.assignedTo && <i className="asig">{c.assignedTo.firstName}</i>}
                </span>
              </button>
            </li>
          ))}
        </ul>

        {detalle ? (
          <Conversacion
            detalle={detalle}
            puedeEscribir={puedeEscribir}
            puedePausarIa={sesion.permissions.includes('ai.toggle')}
            alCambiar={() => {
              void cargarDetalle(detalle.id);
              void cargarLista();
            }}
          />
        ) : (
          <div className="sin-chat">Elija una conversación</div>
        )}
      </div>
    </>
  );
}

function Conversacion({
  detalle,
  puedeEscribir,
  puedePausarIa,
  alCambiar,
}: {
  detalle: Detalle;
  puedeEscribir: boolean;
  puedePausarIa: boolean;
  alCambiar: () => void;
}) {
  const [texto, setTexto] = useState('');
  const [interno, setInterno] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const fondo = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fondo.current?.scrollIntoView({ behavior: 'smooth' });
  }, [detalle.messages.length]);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!texto.trim() || enviando) return;

    setEnviando(true);
    try {
      await api.post(`/conversaciones/${detalle.id}/mensajes`, { texto, interno });
      setTexto('');
      alCambiar();
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="charla">
      <header className="charla-cab">
        <div>
          <b>{detalle.person?.displayName ?? detalle.contactName ?? detalle.phoneNumber}</b>
          <span>{detalle.phoneNumber}</span>
        </div>
        {puedePausarIa && (
          <button
            type="button"
            className="btn-mini"
            onClick={() =>
              void api
                .post(`/conversaciones/${detalle.id}/ia`, { activa: !detalle.aiEnabled })
                .then(alCambiar)
            }
          >
            <Icono nombre="chispa" tam={15} />
            {detalle.aiEnabled ? 'Pausar asistente' : 'Reanudar asistente'}
          </button>
        )}
      </header>

      <div className="charla-cuerpo">
        {detalle.messages.map((m) => (
          <div
            key={m.id}
            className={`burbuja ${m.direction === 'ENTRANTE' ? 'entra' : 'sale'} ${
              m.isInternal ? 'nota' : ''
            } ${m.status === 'FALLIDO' ? 'fallo' : ''}`}
          >
            {m.isInternal && <span className="etiqueta">Nota interna · no la ve el paciente</span>}
            <p>{m.body ?? `[${m.type.toLowerCase()}]`}</p>
            <span className="meta">
              {new Date(m.createdAt).toLocaleTimeString('es-CO', {
                hour: '2-digit',
                minute: '2-digit',
              })}
              {m.author === 'IA' && ' · asistente'}
              {m.sentBy && ` · ${m.sentBy.firstName}`}
              {m.status === 'PENDIENTE' && ' · enviando…'}
              {m.status === 'FALLIDO' && ` · no se envió: ${m.error ?? 'error'}`}
            </span>
          </div>
        ))}
        <div ref={fondo} />
      </div>

      {puedeEscribir ? (
        <form className="charla-pie" onSubmit={enviar}>
          <label className="interno">
            <input type="checkbox" checked={interno} onChange={(e) => setInterno(e.target.checked)} />
            Nota interna
          </label>
          <div className="fila">
            <input
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder={interno ? 'Nota para el equipo…' : 'Escriba al paciente…'}
              maxLength={4000}
            />
            <button className="btn-enviar" type="submit" disabled={enviando || !texto.trim()}>
              {enviando ? '…' : 'Enviar'}
            </button>
          </div>
        </form>
      ) : (
        <p className="charla-pie tenue">Su rol permite leer, no responder.</p>
      )}
    </div>
  );
}
