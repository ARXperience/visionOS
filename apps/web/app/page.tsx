'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { Icono } from '../components/icono';
import { useSesion } from '../components/marco';
import { api } from '../lib/api';
import { ETIQUETA_ESTADO, GRUPOS, MODULOS } from '../lib/modulos';

interface Resumen {
  sedes: number;
  servicios: number;
}

export default function CentroDeControl() {
  const sesion = useSesion();
  const [resumen, setResumen] = useState<Resumen | null>(null);

  useEffect(() => {
    Promise.all([
      api.get<unknown[]>('/catalogo/sedes'),
      api.get<unknown[]>('/catalogo/servicios'),
    ])
      .then(([sedes, servicios]) => setResumen({ sedes: sedes.length, servicios: servicios.length }))
      .catch(() => setResumen(null));
  }, []);

  const listos = MODULOS.filter((m) => m.estado === 'disponible').length;
  const enObra = MODULOS.filter((m) => m.estado === 'construccion').length;

  return (
    <>
      <h1>Centro de control</h1>
      <p className="sub">
        Buenos días, {sesion.firstName}. Esto es lo que el sistema sabe hoy.
      </p>

      <div className="cifras">
        <Cifra valor={resumen?.sedes ?? '—'} etiqueta="Sedes activas" />
        <Cifra valor={resumen?.servicios ?? '—'} etiqueta="Servicios en catálogo" />
        <Cifra valor={`${listos + enObra}/${MODULOS.length}`} etiqueta="Módulos iniciados" />
      </div>

      {/*
        El tablero real —citas de hoy, confirmadas, no-shows, conversaciones
        sin responder— es la entrega E7 y necesita que existan agenda e inbox.
        Mostrar esos números en cero ahora mismo sería mentir con precisión:
        parecería un día sin citas, no un módulo sin construir.
      */}
      <p className="aviso">
        Todavía no hay citas, conversaciones ni pacientes: la agenda llega en la entrega E3 y el
        inbox en la E2. Este tablero mostrará el día real cuando existan — no cifras en cero que
        parezcan un día vacío.
      </p>

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
              <Link key={m.id || 'inicio'} href={m.id ? `/${m.id}` : '/'} className={`ficha e-${m.estado}`}>
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

function Cifra({ valor, etiqueta }: { valor: string | number; etiqueta: string }) {
  return (
    <div className="cifra">
      <b>{valor}</b>
      <span>{etiqueta}</span>
    </div>
  );
}
