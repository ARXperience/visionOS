import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { PermissionsGuard } from './common/guards/permissions.guard';
import { HealthController } from './health/health.controller';
import { AuditModule } from './modules/audit/audit.module';
import { BillingModule } from './modules/billing/billing.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { OpticsModule } from './modules/optics/optics.module';
import { AiModule } from './modules/ai/ai.module';
import { AppointmentsModule } from './modules/appointments/appointments.module';
import { AuthModule } from './modules/auth/auth.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { ChannelsModule } from './modules/channels/channels.module';
import { ConversationsModule } from './modules/conversations/conversations.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { OrdersModule } from './modules/orders/orders.module';
import { PatientsModule } from './modules/patients/patients.module';
import { TimelineModule } from './modules/timeline/timeline.module';
import { RemindersModule } from './modules/reminders/reminders.module';
import { ProfessionalsModule } from './modules/professionals/professionals.module';
import { UsersModule } from './modules/users/users.module';
import { PqrsfModule } from './modules/pqrsf/pqrsf.module';
import { StorageModule } from './modules/storage/storage.module';
import { SurgeriesModule } from './modules/surgeries/surgeries.module';
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
    BillingModule,
    InventoryModule,
    OpticsModule,
    TimelineModule,
    AuthModule,
    CatalogModule,
    ChannelsModule,
    ConversationsModule,
    AppointmentsModule,
    PatientsModule,
    RemindersModule,
    DashboardModule,
    AiModule,
    UsersModule,
    ProfessionalsModule,
    OrdersModule,
    PqrsfModule,
    StorageModule,
    SurgeriesModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AppModule {}
