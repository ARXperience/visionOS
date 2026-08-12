async function estadoApi() {
  const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
  try {
    const r = await fetch(`${base}/health`, { cache: 'no-store' });
    if (!r.ok) return null;
    return (await r.json()) as { status: string; sha: string; database: string };
  } catch {
    return null;
  }
}

export default async function Home() {
  const salud = await estadoApi();

  return (
    <main style={{ maxWidth: 640, margin: '0 auto', padding: '96px 26px' }}>
      <h1 style={{ fontSize: '2.2rem', letterSpacing: '-0.03em', margin: 0 }}>VISION OS</h1>
      <p style={{ color: '#5A6E85', marginTop: 12 }}>
        Esqueleto desplegado. El primer módulo con pacientes reales es el inbox de WhatsApp.
      </p>

      <dl
        style={{
          marginTop: 40,
          padding: 24,
          background: '#fff',
          border: '1px solid #E4ECF4',
          borderRadius: 16,
          display: 'grid',
          gridTemplateColumns: 'auto 1fr',
          gap: '10px 24px',
          fontSize: '0.92rem',
        }}
      >
        <dt style={{ color: '#5A6E85' }}>API</dt>
        <dd style={{ margin: 0 }}>{salud ? salud.status : 'sin respuesta'}</dd>
        <dt style={{ color: '#5A6E85' }}>Base de datos</dt>
        <dd style={{ margin: 0 }}>{salud?.database ?? '—'}</dd>
        <dt style={{ color: '#5A6E85' }}>Commit</dt>
        <dd style={{ margin: 0, fontFamily: 'ui-monospace, monospace' }}>
          {salud?.sha?.slice(0, 12) ?? '—'}
        </dd>
      </dl>
    </main>
  );
}
