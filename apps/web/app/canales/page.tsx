'use client';

import { useCallback, useEffect, useState } from 'react';

import { api } from '../../lib/api';

interface Canal {
  id: string;
  name: string;
  status: string;
  phoneNumber: string | null;
  lastConnectedAt: string | null;
  lastError: string | null;
  site: { code: string; name: string } | null;
  _count: { conversations: number };
}

const ESTADO: Record<string, { texto: string; clase: string }> = {
  CONECTADO: { texto: 'Conectado', clase: 'disponible' },
  ESPERANDO_QR: { texto: 'Esperando escaneo', clase: 'construccion' },
  CONECTANDO: { texto: 'Conectando', clase: 'construccion' },
  DESCONECTADO: { texto: 'Desconectado', clase: 'planeado' },
  CERRADA_POR_WHATSAPP: { texto: 'Cerrada por WhatsApp', clase: 'peligro' },
  ERROR: { texto: 'Error', clase: 'peligro' },
};

export default function Canales() {
  const [canales, setCanales] = useState<Canal[] | null>(null);
  const [qr, setQr] = useState<{ canal: string; imagen: string | null } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nombre, setNombre] = useState('');

  const cargar = useCallback(
    () =>
      api
        .get<Canal[]>('/canales')
        .then(setCanales)
        .catch((e: Error) => setError(e.message)),
    [],
  );

  useEffect(() => {
    void cargar();
    // Mientras se espera el escaneo hay que ver el cambio de estado en
    // cuanto ocurra: el QR caduca en un minuto.
    const t = setInterval(() => void cargar(), 4000);
    return () => clearInterval(t);
  }, [cargar]);

  useEffect(() => {
    if (!qr) return;
    const t = setInterval(() => {
      void api
        .get<{ qr: string | null; status: string }>(`/canales/${qr.canal}/qr`)
        .then((r) => {
          if (r.status === 'CONECTADO') setQr(null);
          else setQr({ canal: qr.canal, imagen: r.qr });
        })
        .catch(() => undefined);
    }, 2500);
    return () => clearInterval(t);
  }, [qr]);

  async function vincular(id: string) {
    setError(null);
    try {
      await api.post(`/canales/${id}/conectar`);
      setQr({ canal: id, imagen: null });
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <>
      <span className="miga">Sistema</span>
      <h1>Líneas de WhatsApp</h1>
      <p className="sub">
        Cada línea es un número. Vincular abre una sesión que queda guardada cifrada: no hay que
        volver a escanear el QR en cada reinicio.
      </p>

      <div className="aviso">
        <b>No vincule todavía el número principal de la clínica.</b> La conexión es por WhatsApp
        Web mediante una biblioteca no oficial, y un número recién automatizado tiene más riesgo
        de que WhatsApp lo cierre. Use una SIM nueva y déle dos o tres semanas de uso normal
        antes de automatizarla. El número de las tarjetas y de Google Maps no es reemplazable.
      </div>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <form
        className="crear"
        onSubmit={(e) => {
          e.preventDefault();
          if (!nombre.trim()) return;
          void api.post('/canales', { nombre }).then(() => {
            setNombre('');
            void cargar();
          });
        }}
      >
        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Nombre de la línea — p. ej. Central o Ibagué"
          maxLength={60}
        />
        <button className="btn-mini" type="submit">
          Crear línea
        </button>
      </form>

      <table className="tabla" style={{ marginTop: 22 }}>
        <thead>
          <tr>
            <th>Línea</th>
            <th style={{ width: 170 }}>Estado</th>
            <th style={{ width: 160 }}>Número</th>
            <th style={{ width: 120 }}>Chats</th>
            <th style={{ width: 140 }} />
          </tr>
        </thead>
        <tbody>
          {canales?.map((c) => {
            const e = ESTADO[c.status] ?? { texto: c.status, clase: 'planeado' };
            return (
              <tr key={c.id}>
                <td>
                  <b>{c.name}</b>
                  {c.site && <span className="tenue"> · {c.site.code}</span>}
                  {c.lastError && (
                    <div className="tenue" style={{ fontSize: '0.78rem' }}>
                      {c.lastError}
                    </div>
                  )}
                </td>
                <td>
                  <em className={`estado ${e.clase}`}>{e.texto}</em>
                </td>
                <td className="tenue">{c.phoneNumber ?? '—'}</td>
                <td className="tenue">{c._count.conversations}</td>
                <td>
                  {c.status !== 'CONECTADO' && (
                    <button className="btn-mini" type="button" onClick={() => void vincular(c.id)}>
                      Vincular
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
          {canales?.length === 0 && (
            <tr>
              <td colSpan={5} className="tenue">
                Sin líneas todavía.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {qr && (
        <div className="qr-caja">
          <h2 style={{ fontSize: '1.05rem' }}>Escanee desde WhatsApp</h2>
          <p className="tenue" style={{ fontSize: '0.87rem' }}>
            WhatsApp → Dispositivos vinculados → Vincular un dispositivo. El código caduca en un
            minuto; si expira, se genera otro solo.
          </p>
          {qr.imagen ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qr.imagen} alt="Código QR para vincular WhatsApp" width={280} height={280} />
          ) : (
            <p className="tenue">Generando código…</p>
          )}
          <button className="btn-mini" type="button" onClick={() => setQr(null)}>
            Cerrar
          </button>
        </div>
      )}
    </>
  );
}
