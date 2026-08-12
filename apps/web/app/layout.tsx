import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'VISION OS — Visión Colombia',
  description: 'Sistema de gestión de la clínica oftalmológica Visión Colombia.',
};

export const viewport: Viewport = {
  themeColor: '#0A2452',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body
        style={{
          margin: 0,
          fontFamily: 'Inter, system-ui, -apple-system, "Segoe UI", sans-serif',
          color: '#0C1B2A',
          background: '#F4F8FC',
        }}
      >
        {children}
      </body>
    </html>
  );
}
