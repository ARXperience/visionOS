import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { HealthController } from './health/health.controller';
import { PrismaModule } from './prisma/prisma.module';

/**
 * Importa 8 modulos, no 27. Cada modulo que entra aqui es un modulo que
 * hay que mantener durante anos: entra cuando su entrega lo exige.
 */
@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule],
  controllers: [HealthController],
})
export class AppModule {}
