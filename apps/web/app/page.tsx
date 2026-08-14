'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { Icono } from '../components/icono';
import { useSesion } from '../components/marco';
import { api } from '../lib/api';
import { ETIQUETA_ESTADO, GRUPOS, MODULOS } from '../lib/modulos';

interface Tablero {
  citas: {
    total: number;
    confirmadas: number;
    sinConfirmar: number;
    enSala: number;
    atendiendo: number;
    finalizadas: number;
    noAsistio: number;
    canceladas: number;
  };
  porSede: { code: string; citas: number }[];
  conversacionesSinResponder: number;
  leadsNuevos: number;
  canales: { id: string; name: string; status: string; lastError: string | null }[];
  noShowMesAnterior: number | null;
}

/** Recepción y coordinación lo dejan abierto: se refresca solo. */
const CADA_MS = 30_000;

export default function CentroDeControl() {
  const sesion = useSesion();
  const [t, setT] = useState<Tablero | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const cargar = () =>
      api
        .get<Tablero>('/tablero')
        .then(setT)
        .catch((e: Error) => setError(e.message));
    void cargar();
    const id = setInterval(() => void cargar(), CADA_MS);
    return () => clearInterval(id);
  }, []);

  const caidos = (t?.canales ?? []).filter((c) => c.status === 'CERRADA_POR_WHATSAPP' || c.status === 'ERROR');

  return (
    <>
      <h1>Centro de control</h1>
      <p className="sub">
        Hola, {sesion.firstName}. Esto es el día de hoy, actualizado solo cada{' '}
        {CADA_MS / 1000} segundos.
      </p>

      {error && <p className="error" role="alert">{error}</p>}

      {/* Lo primero que hay que ver si pasa: sin WhatsApp la clínica pierde
          su canal principal, y eso no puede estar enterrado en una tabla. */}
      {caidos.length > 0 && (
        <p className="alarma" role="alert">
          <Icono nombre="campana" tam={18} />
          <span>
            {caidos.length === 1 ? 'La línea' : 'Las líneas'} <b>{caidos.map((c) => c.name).join(', ')}</b>{' '}
            {caidos.some((c) => c.status === 'CERRADA_POR_WHATSAPP')
              ? 'la cerró WhatsApp. No se reintenta sola: requiere que alguien la revise.'
              : 'está con error.'}{' '}
            <Link href="/canales">Ver líneas</Link>
          </span>
        </p>
      )}

      <div className="cifras">
        <Cifra valor={t?.citas.total} etiqueta="Citas hoy" />
        <Cifra
          valor={t?.citas.sinConfirmar}
          etiqueta="Sin confirmar"
          alerta={(t?.citas.sinConfirmar ?? 0) > 0}
        />
        <Cifra valor={t?.citas.enSala} etiqueta="En sala de espera" />
        <Cifra valor={t?.citas.atendiendo} etiqueta="En atención" />
        <Cifra
          valor={t?.conversacionesSinResponder}
          etiqueta="Chats sin responder +15 min"
          alerta={(t?.conversacionesSinResponder ?? 0) > 0}
        />
        <Cifra valor={t?.citas.noAsistio} etiqueta="No asistieron hoy" />
      </div>

      {t && t.porSede.length > 0 && (
        <p className="tenue" style={{ marginTop: 14, fontSize: '0.87rem' }}>
          Por sede: {t.porSede.map((s) => `${s.code} ${s.citas}`).join(' · ')}
          {t.noShowMesAnterior !== null && (
            <> · no-show del mes anterior: {t.noShowMesAnterior}%</>
          )}
        </p>
      )}

      {t && t.citas.total === 0 && (
        <p className="aviso">
          No hay citas para hoy. Si la clínica sí está atendiendo, es que la agenda todavía no se
          está usando — no que el día esté vacío.
        </p>
      )}

      <h2 style={{ marginTop: 44 }}>El ecosistema</h2>
      <p className="sub">
        {MODULOS.length} módulos sobre una sola base de pacientes, sedes, servicios, agenda,
        conversaciones y eventos. Lo que no está construido lo dice.
      </p>

      {GRUPOS.map((grupo) => (
        <section key={grupo} style={{ marginTop: 30 }}>
          <h3 className="grupo-titulo">{grupo}</h3>
          <div className="rejilla">
            {MODULOS.filter((m) => m.grupo === grupo).map((m) => (
              <Link
                key={m.id || 'inicio'}
                href={m.id ? `/${m.id}` : '/'}
                className={`ficha e-${m.estado}`}
              >
                <span className="ficha-cab">
                  <Icono nombre={m.icono} tam={20} />
                  <b>{m.nombre}</b>
                </span>
                <p>{m.resumen}</p>
                <span className="ficha-pie">
                  <em className={`estado ${m.estado}`}>{ETIQUETA_ESTADO[m.estado]}</em>
                  {m.entrega ? <i>{m.entrega}</i> : <i className="fuera">fuera de fase 1</i>}
                </span>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </>
  );
}

function Cifra({
  valor,
  etiqueta,
  alerta,
}: {
  valor: number | undefined;
  etiqueta: string;
  alerta?: boolean;
}) {
  return (
    <div className={`cifra ${alerta ? 'ojo' : ''}`}>
      <b>{valor ?? '—'}</b>
      <span>{etiqueta}</span>
    </div>
  );
}
