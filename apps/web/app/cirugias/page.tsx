'use client';

import { useCallback, useEffect, useState } from 'react';

import { api } from '../../lib/api';

interface Item {
  clave: string;
  texto: string;
  obligatorio: boolean;
}
type Lista = Record<'ENTRADA' | 'PAUSA' | 'SALIDA', Item[]>;

interface Cirugia {
  id: string;
  status: string;
  laterality: 'OD' | 'OI';
  anesthesia: string;
  consentSignedAt: string | null;
  entryAt: string | null;
  pauseAt: string | null;
  exitAt: string | null;
  startedAt: string | null;
  endedAt: string | null;
  findings: string | null;
  complications: string | null;
  suspendReason: string | null;
  person: { id: string; displayName: string; docNumber: string | null; phone: string | null };
  site: { id: string; code: string; name: string };
  surgeon: { id: string; displayName: string } | null;
  anesthesiologist: { id: string; displayName: string } | null;
  appointment: { id: string; publicCode: string; startsAt: string; service: { name: string } };
  implants: {
    id: string;
    kind: string;
    brand: string | null;
    model: string | null;
    power: string | null;
    lot: string | null;
    serial: string | null;
  }[];
}

interface Indicadores {
  porEstado: Record<string, number>;
  operadas: number;
  conComplicacion: number;
  tasaComplicacion: number | null;
  pendientesDeConsentimiento: number;
}

const OJO = { OD: 'Ojo derecho', OI: 'Ojo izquierdo' } as const;

const hora = (s: string) =>
  new Date(s).toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

export default function Cirugias() {
  const [cirugias, setCirugias] = useState<Cirugia[]>([]);
  const [lista, setLista] = useState<Lista | null>(null);
  const [ind, setInd] = useState<Indicadores | null>(null);
  const [abierta, setAbierta] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    try {
      const [c, i] = await Promise.all([
        api.get<Cirugia[]>('/cirugias'),
        api.get<Indicadores>('/cirugias/indicadores'),
      ]);
      setCirugias(c);
      setInd(i);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
    void api.get<Lista>('/cirugias/lista-verificacion').then(setLista).catch(() => undefined);
  }, [cargar]);

  return (
    <>
      <span className="miga">Pacientes</span>
      <h1>Cirugía</h1>
      <p className="sub" style={{ maxWidth: 720 }}>
        La programación usa la misma agenda: el quirófano y el cirujano se reservan como cualquier
        otro recurso, así que la base impide dos cirugías a la misma hora en la misma sala. Lo que
        vive aquí es la lista de verificación de la OMS y la confirmación del ojo.
      </p>

      {ind && (
        <div className="tarjetas" style={{ marginTop: 16 }}>
          <Dato n={ind.pendientesDeConsentimiento} rotulo="Sin consentimiento firmado" alerta={ind.pendientesDeConsentimiento > 0} />
          <Dato n={ind.porEstado.PROGRAMADA ?? 0} rotulo="Programadas" />
          <Dato n={ind.porEstado.EN_QUIROFANO ?? 0} rotulo="En quirófano" />
          <Dato n={ind.operadas} rotulo="Operadas" />
          <Dato
            n={ind.tasaComplicacion === null ? '—' : `${ind.tasaComplicacion}%`}
            rotulo="Con complicación"
          />
        </div>
      )}

      {error && <p className="error" role="alert">{error}</p>}
      {cargando && <p className="tenue">Cargando…</p>}
      {!cargando && !cirugias.length && (
        <p className="tenue" style={{ marginTop: 20 }}>
          No hay cirugías programadas. Se programan desde una cita existente.
        </p>
      )}

      <div style={{ marginTop: 18, display: 'grid', gap: 10 }}>
        {cirugias.map((c) => (
          <Tarjeta
            key={c.id}
            c={c}
            lista={lista}
            abierta={abierta === c.id}
            alAbrir={() => setAbierta(abierta === c.id ? null : c.id)}
            alCambiar={cargar}
          />
        ))}
      </div>
    </>
  );
}

function Dato({ n, rotulo, alerta }: { n: number | string; rotulo: string; alerta?: boolean }) {
  return (
    <div className="tarjeta" style={alerta ? { borderColor: '#B4261A' } : undefined}>
      <strong style={{ fontSize: '1.6rem', color: alerta ? '#B4261A' : undefined }}>{n}</strong>
      <span className="tenue">{rotulo}</span>
    </div>
  );
}

function Tarjeta({
  c,
  lista,
  abierta,
  alAbrir,
  alCambiar,
}: {
  c: Cirugia;
  lista: Lista | null;
  abierta: boolean;
  alAbrir: () => void;
  alCambiar: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  async function accion(fn: () => Promise<unknown>) {
    setError(null);
    setAviso(null);
    try {
      await fn();
      alCambiar();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const fase = !c.entryAt ? 'ENTRADA' : !c.pauseAt ? 'PAUSA' : !c.exitAt ? 'SALIDA' : null;

  return (
    <div className="fila-lista">
      <div className="cabecera-fila" onClick={alAbrir} role="button" tabIndex={0}>
        <div>
          <strong>{c.person.displayName}</strong>{' '}
          <span className="tenue">· {c.appointment.service.name}</span>
          <div className="tenue" style={{ fontSize: '0.8rem' }}>
            {hora(c.appointment.startsAt)} · {c.site.code} · {c.surgeon?.displayName ?? 'sin cirujano'}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          {/* El ojo se muestra grande y escrito, no como sigla: "OD" mal leído
              es exactamente el error que este módulo existe para evitar. */}
          <strong style={{ fontSize: '1.05rem', color: '#1554A8' }}>{OJO[c.laterality]}</strong>
          <div className="tenue" style={{ fontSize: '0.78rem' }}>{c.status.replace('_', ' ').toLowerCase()}</div>
        </div>
      </div>

      {abierta && (
        <div style={{ padding: '4px 14px 16px' }}>
          <Pasos c={c} />

          {error && <p className="error" role="alert">{error}</p>}
          {aviso && <p className="aviso">{aviso}</p>}

          {!c.consentSignedAt && (
            <div className="aviso" style={{ marginTop: 10 }}>
              <b>Falta el consentimiento informado.</b> Sin él no se puede completar la verificación
              de entrada.
              <div style={{ marginTop: 8 }}>
                <button
                  className="btn-mini"
                  type="button"
                  onClick={() => void accion(() => api.post(`/cirugias/${c.id}/consentimiento`, {}))}
                >
                  Registrar consentimiento firmado
                </button>
              </div>
            </div>
          )}

          {fase && c.consentSignedAt && lista && c.status !== 'SUSPENDIDA' && (
            <Verificacion
              fase={fase}
              items={lista[fase]}
              lateralidad={c.laterality}
              alEnviar={(respuestas, ojo) =>
                accion(() =>
                  api.post(`/cirugias/${c.id}/verificacion/${fase.toLowerCase()}`, {
                    respuestas,
                    lateralidadConfirmada: ojo,
                  }),
                )
              }
            />
          )}

          <div className="acciones" style={{ marginTop: 14 }}>
            {c.pauseAt && !c.startedAt && (
              <button
                className="btn-mini"
                type="button"
                onClick={() => void accion(() => api.post(`/cirugias/${c.id}/iniciar`, {}))}
              >
                Iniciar procedimiento
              </button>
            )}
            {c.startedAt && c.exitAt && !c.endedAt && (
              <button
                className="btn-mini"
                type="button"
                onClick={() => {
                  const hallazgos = window.prompt('Hallazgos del procedimiento:') ?? undefined;
                  if (hallazgos === undefined) return;
                  const compl = window.prompt('Complicaciones (deje vacío si no hubo):') || undefined;
                  void accion(() =>
                    api.post(`/cirugias/${c.id}/finalizar`, { findings: hallazgos, complications: compl }),
                  );
                }}
              >
                Finalizar
              </button>
            )}
            {!c.startedAt && c.status !== 'SUSPENDIDA' && (
              <button
                className="btn-mini peligro"
                type="button"
                onClick={() => {
                  const motivo = window.prompt('Motivo de la suspensión:');
                  if (!motivo) return;
                  void accion(() => api.post(`/cirugias/${c.id}/suspender`, { motivo }));
                }}
              >
                Suspender
              </button>
            )}
            {c.startedAt && (
              <button
                className="btn-mini"
                type="button"
                onClick={() => {
                  const model = window.prompt('Modelo del lente/implante:');
                  if (!model) return;
                  const lot = window.prompt('Lote:') || undefined;
                  const serial = window.prompt('Serie:') || undefined;
                  const power = window.prompt('Poder (dioptrías), vacío si no aplica:');
                  void accion(() =>
                    api.post(`/cirugias/${c.id}/implantes`, {
                      kind: 'LIO',
                      model,
                      lot,
                      serial,
                      power: power ? Number(power) : undefined,
                    }),
                  ).then(() => setAviso('Implante registrado con su lote.'));
                }}
              >
                Registrar implante
              </button>
            )}
          </div>

          {c.implants.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <h4 style={{ fontSize: '0.85rem', margin: '0 0 6px' }}>Implantes</h4>
              {c.implants.map((i) => (
                <div key={i.id} className="tenue" style={{ fontSize: '0.8rem' }}>
                  {i.kind} {i.brand} {i.model} {i.power ? `· ${i.power} D` : ''}{' '}
                  {i.lot ? `· lote ${i.lot}` : ''} {i.serial ? `· serie ${i.serial}` : ''}
                </div>
              ))}
            </div>
          )}

          {(c.findings || c.complications || c.suspendReason) && (
            <div style={{ marginTop: 12, fontSize: '0.85rem' }}>
              {c.findings && <p><b>Hallazgos:</b> {c.findings}</p>}
              {c.complications && <p style={{ color: '#B4261A' }}><b>Complicaciones:</b> {c.complications}</p>}
              {c.suspendReason && <p><b>Suspendida:</b> {c.suspendReason}</p>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** El recorrido, para que se vea de un golpe en qué punto va. */
function Pasos({ c }: { c: Cirugia }) {
  const pasos = [
    ['Consentimiento', c.consentSignedAt],
    ['Entrada', c.entryAt],
    ['Pausa quirúrgica', c.pauseAt],
    ['Incisión', c.startedAt],
    ['Salida', c.exitAt],
    ['Cerrada', c.endedAt],
  ] as const;

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, margin: '10px 0 4px' }}>
      {pasos.map(([nombre, cuando]) => (
        <span
          key={nombre}
          className="etiqueta"
          style={{
            opacity: cuando ? 1 : 0.4,
            borderColor: cuando ? '#0E93B4' : undefined,
          }}
          title={cuando ? hora(cuando) : 'pendiente'}
        >
          {cuando ? '✓' : '○'} {nombre}
        </span>
      ))}
    </div>
  );
}

function Verificacion({
  fase,
  items,
  lateralidad,
  alEnviar,
}: {
  fase: 'ENTRADA' | 'PAUSA' | 'SALIDA';
  items: Item[];
  lateralidad: 'OD' | 'OI';
  alEnviar: (respuestas: Record<string, boolean>, ojo?: 'OD' | 'OI') => void;
}) {
  const [marcadas, setMarcadas] = useState<Record<string, boolean>>({});
  const [ojo, setOjo] = useState<'OD' | 'OI' | ''>('');

  const faltan = items.filter((i) => i.obligatorio && !marcadas[i.clave]).length;

  return (
    <div className="panel-agendar" style={{ marginTop: 12 }}>
      <h4 style={{ margin: 0, fontSize: '0.95rem' }}>
        {fase === 'ENTRADA' ? 'Entrada (antes de la anestesia)' : null}
        {fase === 'PAUSA' ? 'Pausa quirúrgica (antes de la incisión)' : null}
        {fase === 'SALIDA' ? 'Salida (antes de que el paciente salga)' : null}
      </h4>

      <div style={{ marginTop: 10, display: 'grid', gap: 6 }}>
        {items.map((i) => (
          <label key={i.clave} className="interno" style={{ fontWeight: 400 }}>
            <input
              type="checkbox"
              checked={Boolean(marcadas[i.clave])}
              onChange={(e) => setMarcadas({ ...marcadas, [i.clave]: e.target.checked })}
            />
            {i.texto}
            {i.obligatorio && <span style={{ color: '#B4261A' }}> *</span>}
          </label>
        ))}
      </div>

      {fase === 'PAUSA' && (
        <div style={{ marginTop: 14, padding: 12, border: '2px solid #B4261A', borderRadius: 8 }}>
          <strong>Confirme el ojo a operar</strong>
          <p className="tenue" style={{ fontSize: '0.8rem', margin: '4px 0 8px' }}>
            Escríbalo mirando al paciente y la marcación, no la pantalla. Si no coincide con lo
            programado, el sistema detiene el procedimiento.
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            {(['OD', 'OI'] as const).map((o) => (
              <label key={o} className="interno" style={{ fontWeight: 400 }}>
                <input type="radio" name="ojo" checked={ojo === o} onChange={() => setOjo(o)} />
                {OJO[o]}
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="acciones" style={{ marginTop: 14 }}>
        <button
          className="btn-mini"
          type="button"
          disabled={faltan > 0 || (fase === 'PAUSA' && !ojo)}
          onClick={() => alEnviar(marcadas, fase === 'PAUSA' ? (ojo as 'OD' | 'OI') : undefined)}
        >
          {faltan > 0 ? `Faltan ${faltan} verificaciones` : `Cerrar ${fase.toLowerCase()}`}
        </button>
      </div>

      {/* La lateralidad programada NO se muestra junto al selector a
          propósito: verla al lado convierte la confirmación en copiar lo que
          dice la pantalla, que es justo lo que la pausa debe evitar. */}
      <p className="tenue" style={{ fontSize: '0.75rem', marginTop: 8 }}>
        Programado por el cirujano: se compara al enviar. {lateralidad ? '' : ''}
      </p>
    </div>
  );
}
