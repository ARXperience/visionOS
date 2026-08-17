'use client';

import { useCallback, useEffect, useState } from 'react';

import { api } from '../../lib/api';

interface Paciente {
  id: string;
  displayName: string;
  docNumber: string | null;
  phone: string | null;
}

interface Documento {
  id: string;
  kind: string;
  title: string;
  fileName: string;
  sizeBytes: number;
  sha256: string;
  expiresAt: string | null;
  vencido: boolean;
  createdAt: string;
  uploadedBy: { firstName: string; lastName: string } | null;
}

const TIPOS = [
  'DOCUMENTO_IDENTIDAD',
  'AUTORIZACION',
  'ORDEN_MEDICA',
  'CONSENTIMIENTO',
  'HISTORIA_EXTERNA',
  'SOPORTE_PAGO',
  'OTRO',
];

const legible = (s: string) => s.replace(/_/g, ' ').toLowerCase();
const kb = (n: number) => `${Math.round(n / 1024)} KB`;
const fecha = (s: string | null) => (s ? s.slice(0, 10) : '—');

export default function Documentos() {
  const [q, setQ] = useState('');
  const [resultados, setResultados] = useState<Paciente[]>([]);
  const [paciente, setPaciente] = useState<Paciente | null>(null);
  const [docs, setDocs] = useState<Documento[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (q.trim().length < 3) {
      setResultados([]);
      return;
    }
    const t = setTimeout(() => {
      void api
        .get<Paciente[]>(`/pacientes/buscar?q=${encodeURIComponent(q.trim())}`)
        .then(setResultados)
        .catch((e: Error) => setError(e.message));
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const cargar = useCallback(async () => {
    if (!paciente) return;
    try {
      setDocs(await api.get<Documento[]>(`/documentos/paciente/${paciente.id}`));
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [paciente]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  return (
    <>
      <span className="miga">Pacientes</span>
      <h1>Documentos</h1>
      <p className="sub" style={{ maxWidth: 760 }}>
        La copia de la cédula, la autorización de la EPS, la orden que el paciente trajo en papel:
        lo que hoy vive en una carpeta compartida sin saber quién la abrió. Los resultados de examen
        y los consentimientos quirúrgicos no están aquí —tienen sus propias reglas y viven en su
        módulo—. Cada apertura queda auditada y el enlace dura cinco minutos.
      </p>

      {error && <p className="error" role="alert">{error}</p>}

      <div style={{ marginTop: 18, maxWidth: 460 }}>
        <input
          placeholder="Buscar paciente por nombre, documento o teléfono…"
          value={paciente ? paciente.displayName : q}
          onChange={(e) => {
            setPaciente(null);
            setQ(e.target.value);
          }}
          style={{ width: '100%' }}
        />
        {!paciente && resultados.length > 0 && (
          <div className="fila-lista" style={{ marginTop: 4 }}>
            {resultados.map((p) => (
              <div
                key={p.id}
                className="cabecera-fila"
                role="button"
                tabIndex={0}
                onClick={() => {
                  setPaciente(p);
                  setResultados([]);
                }}
              >
                <div>
                  <strong>{p.displayName}</strong>
                  <div className="tenue" style={{ fontSize: '0.8rem' }}>
                    {p.docNumber ?? 'sin documento'} · {p.phone ?? 'sin teléfono'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {paciente && (
        <>
          <Subir personId={paciente.id} alSubir={cargar} />

          <table className="tabla" style={{ marginTop: 18 }}>
            <thead>
              <tr><th>Documento</th><th>Tipo</th><th>Vence</th><th>Cargado</th><th /></tr>
            </thead>
            <tbody>
              {docs.map((d) => (
                <tr key={d.id}>
                  <td>
                    <b>{d.title}</b>
                    <div className="tenue" style={{ fontSize: '0.76rem' }}>
                      {d.fileName} · {kb(d.sizeBytes)}
                    </div>
                  </td>
                  <td className="tenue">{legible(d.kind)}</td>
                  <td style={d.vencido ? { color: '#B4261A' } : undefined}>
                    {fecha(d.expiresAt)}{d.vencido && ' · vencido'}
                  </td>
                  <td className="tenue">
                    {fecha(d.createdAt)}
                    {d.uploadedBy && <div style={{ fontSize: '0.76rem' }}>{d.uploadedBy.firstName}</div>}
                  </td>
                  <td>
                    <button
                      className="btn-mini"
                      type="button"
                      onClick={() =>
                        void api
                          .get<{ url: string }>(`/documentos/${d.id}/abrir`)
                          .then((r) => window.open(r.url, '_blank'))
                          .catch((e: Error) => setError(e.message))
                      }
                    >
                      Abrir
                    </button>
                    <button
                      className="btn-mini peligro"
                      type="button"
                      onClick={() => {
                        // Archivar, no borrar: bajo la Res. 1995 un documento
                        // clínico se conserva quince años.
                        const motivo = window.prompt('Motivo para archivarlo (no se borra):');
                        if (!motivo) return;
                        void api
                          .post(`/documentos/${d.id}/archivar`, { motivo })
                          .then(cargar)
                          .catch((e: Error) => setError(e.message));
                      }}
                    >
                      Archivar
                    </button>
                  </td>
                </tr>
              ))}
              {!docs.length && <tr><td colSpan={5} className="tenue">Sin documentos.</td></tr>}
            </tbody>
          </table>
        </>
      )}
    </>
  );
}

function Subir({ personId, alSubir }: { personId: string; alSubir: () => void }) {
  const [archivo, setArchivo] = useState<File | null>(null);
  const [sha, setSha] = useState<string | null>(null);
  const [kind, setKind] = useState('AUTORIZACION');
  const [title, setTitle] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function elegir(f: File) {
    setArchivo(f);
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, ''));
    // El hash se calcula en el navegador: así no hay que subir el archivo dos
    // veces ni confiar en que el servidor lo recibió íntegro para comprobarlo.
    const hash = await crypto.subtle.digest('SHA-256', await f.arrayBuffer());
    setSha([...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join(''));
  }

  async function subir() {
    if (!archivo || !sha) return;
    setSubiendo(true);
    setError(null);
    try {
      const firma = await api.post<{ url: string; key: string }>('/archivos/firmar-subida', {
        nombre: archivo.name,
        tipo: archivo.type || 'application/pdf',
        bytes: archivo.size,
        destino: 'documentos',
      });
      const r = await fetch(firma.url, {
        method: 'PUT',
        body: archivo,
        headers: { 'content-type': archivo.type || 'application/pdf' },
      });
      if (!r.ok) throw new Error(`El almacenamiento rechazó el archivo (${r.status}).`);

      await api.post(`/documentos/paciente/${personId}`, {
        kind,
        title: title.trim(),
        fileUrl: firma.key,
        fileName: archivo.name,
        mimeType: archivo.type || 'application/octet-stream',
        sizeBytes: archivo.size,
        sha256: sha,
        expiresAt: expiresAt || undefined,
      });

      setArchivo(null);
      setSha(null);
      setTitle('');
      setExpiresAt('');
      alSubir();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubiendo(false);
    }
  }

  return (
    <div className="panel-agendar" style={{ marginTop: 18 }}>
      <div className="rejilla-form">
        <label>
          Archivo
          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.tif,.tiff,application/pdf,image/*"
            onChange={(e) => e.target.files?.[0] && void elegir(e.target.files[0])}
            style={{ fontWeight: 400 }}
          />
        </label>
        <label>
          Tipo
          <select value={kind} onChange={(e) => setKind(e.target.value)}>
            {TIPOS.map((t) => <option key={t} value={t}>{legible(t)}</option>)}
          </select>
        </label>
        <label>Título<input value={title} onChange={(e) => setTitle(e.target.value)} /></label>
        <label>
          Vence <span className="tenue">(una autorización vence; una cédula no)</span>
          <input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
        </label>
      </div>

      {sha && (
        <p className="tenue" style={{ fontSize: '0.74rem', fontFamily: 'ui-monospace, monospace' }}>
          SHA-256: {sha}
        </p>
      )}
      {error && <p className="error" role="alert">{error}</p>}

      <div className="acciones" style={{ marginTop: 10 }}>
        <button className="btn-mini" type="button" disabled={!archivo || !sha || !title || subiendo} onClick={() => void subir()}>
          {subiendo ? 'Subiendo…' : 'Cargar documento'}
        </button>
      </div>
    </div>
  );
}
