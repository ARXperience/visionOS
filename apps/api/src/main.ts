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

  // En condiciones normales todo sale del mismo origen (el sitio, /admin y
  // /api detrás de Caddy), así que no hay peticiones cruzadas. CORS queda
  // para casos sueltos —un frontend aparte durante una migración— y por eso
  // se configura por lista explícita, nunca con '*'.
  const origenes = (process.env.CORS_ORIGINS ?? '').split(',').filter(Boolean);
  if (origenes.length) app.enableCors({ origin: origenes, credentials: true });

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
