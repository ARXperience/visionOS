import type { Metadata, Viewport } from 'next';
import { Montserrat } from 'next/font/google';
import type { ReactNode } from 'react';

import { Marco } from '../components/marco';
import './globals.css';

/**
 * La misma tipografía del sitio público. Se sirve desde el propio dominio y
 * no desde fonts.googleapis.com: un panel con historias clínicas no tiene
 * por qué avisarle a un tercero cada vez que alguien lo abre.
 */
const montserrat = Montserrat({
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500', '600', '700'],
  variable: '--fuente',
});

export const metadata: Metadata = {
  title: 'VISION OS — Visión Colombia',
  description: 'Sistema administrativo de la clínica oftalmológica Visión Colombia.',
  // Un panel con datos de pacientes no tiene por qué salir en Google.
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#0A2452' },
    { media: '(prefers-color-scheme: dark)', color: '#050B14' },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  // El script de tema modifica <html> antes de la hidratación para evitar un
  // destello de tema. Esta es la única diferencia intencional con el SSR.
  return (
    <html lang="es" className={montserrat.variable} suppressHydrationWarning>
      <head>
        {/* Antes de pintar. Si el tema se aplicara después, el panel
            aparecería claro y saltaría a oscuro delante del usuario en cada
            carga. La clave es la misma que usa el sitio público. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('tema');if(t)document.documentElement.dataset.tema=t}catch(e){}`,
          }}
        />
      </head>
      <body>
        {/* El marco decide: sin sesión pinta el acceso, con sesión el panel. */}
        <Marco>{children}</Marco>
      </body>
    </html>
  );
}
