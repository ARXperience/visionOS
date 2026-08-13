import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  /**
   * Una base caída no impide arrancar. Si `$connect()` tumbara el proceso,
   * `/health` no podría informar `database: down` —el endpoint entero
   * dejaría de responder— y quedaríamos sin forma de distinguir "la API
   * murió" de "Postgres no contesta". Las consultas siguientes fallan solas
   * y Prisma reconecta cuando la base vuelve.
   */
  async onModuleInit(): Promise<void> {
    try {
      await this.$connect();
    } catch (e) {
      this.logger.error(`Sin conexión a Postgres al arrancar: ${(e as Error).message}`);
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
