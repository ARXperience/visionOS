import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { PermissionsGuard } from './common/guards/permissions.guard';
import { HealthController } from './health/health.controller';
import { AuditModule } from './modules/audit/audit.module';
import { AppointmentsModule } from './modules/appointments/appointments.module';
import { AuthModule } from './modules/auth/auth.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { ChannelsModule } from './modules/channels/channels.module';
import { ConversationsModule } from './modules/conversations/conversations.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { PatientsModule } from './modules/patients/patients.module';
import { TimelineModule } from './modules/timeline/timeline.module';
import { RemindersModule } from './modules/reminders/reminders.module';
import { PrismaModule } from './prisma/prisma.module';

/**
 * Importa los módulos que las entregas ya exigen, no 27. Cada módulo que entra
 * aquí es un módulo que hay que mantener durante años.
 *
 * Los tres guards son globales y en este orden: primero se limita el abuso,
 * después se identifica, y solo entonces se autoriza. Todo endpoint queda
 * cerrado salvo que se marque @Public() — el descuido debe fallar cerrado.
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuditModule,
    TimelineModule,
    AuthModule,
    CatalogModule,
    ChannelsModule,
    ConversationsModule,
    AppointmentsModule,
    PatientsModule,
    RemindersModule,
    DashboardModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AppModule {}
