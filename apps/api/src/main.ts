import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';

import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.setGlobalPrefix('api');
  app.use(helmet());
  // El refresh token viaja en cookie httpOnly.
  app.use(cookieParser());

  // Con el panel en Vercel y la API en Hostinger sí hay peticiones cruzadas.
  // La lista es EXPLÍCITA y nunca '*': con `credentials: true`, un comodín
  // significaría que cualquier página de internet puede hacer peticiones
  // autenticadas contra la API de una clínica con la sesión del usuario.
  const origenes = (process.env.CORS_ORIGINS ?? '').split(',').map((o) => o.trim()).filter(Boolean);
  if (origenes.length) {
    app.enableCors({
      origin: origenes,
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['content-type', 'authorization'],
      maxAge: 86_400,
    });
  } else if (process.env.NODE_ENV === 'production') {
    // Sin CORS y con el frontend en otro dominio, el panel no puede hablar
    // con la API y el fallo aparece como "no se pudo conectar" en cada
    // pantalla. Mejor que grite al arrancar.
    console.warn('[main] CORS_ORIGINS vacío y el frontend está en otro dominio: el panel no podrá conectarse.');
  }

  // Detrás de Caddy: sin esto, req.ip es la del proxy y la auditoría de
  // intentos fallidos registraría siempre la misma dirección.
  app.set('trust proxy', 1);
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  app.enableShutdownHooks();

  const port = Number(process.env.API_PORT ?? 3001);
  await app.listen(port);
}

void bootstrap();
