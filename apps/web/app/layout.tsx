import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';

import { Marco } from '../components/marco';
import './globals.css';

export const metadata: Metadata = {
  title: 'VISION OS — Visión Colombia',
  description: 'Sistema administrativo de la clínica oftalmológica Visión Colombia.',
  // Un panel con datos de pacientes no tiene por qué salir en Google.
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: '#0A2452',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body>
        {/* El marco decide: sin sesión pinta el acceso, con sesión el panel. */}
        <Marco>{children}</Marco>
      </body>
    </html>
  );
}
