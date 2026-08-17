"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const core_1 = require("@nestjs/core");
const schedule_1 = require("@nestjs/schedule");
const throttler_1 = require("@nestjs/throttler");
const jwt_auth_guard_1 = require("./common/guards/jwt-auth.guard");
const permissions_guard_1 = require("./common/guards/permissions.guard");
const health_controller_1 = require("./health/health.controller");
const audit_module_1 = require("./modules/audit/audit.module");
const automations_module_1 = require("./modules/automations/automations.module");
const documents_module_1 = require("./modules/documents/documents.module");
const indicators_module_1 = require("./modules/indicators/indicators.module");
const staff_module_1 = require("./modules/staff/staff.module");
const billing_module_1 = require("./modules/billing/billing.module");
const inventory_module_1 = require("./modules/inventory/inventory.module");
const optics_module_1 = require("./modules/optics/optics.module");
const ai_module_1 = require("./modules/ai/ai.module");
const appointments_module_1 = require("./modules/appointments/appointments.module");
const auth_module_1 = require("./modules/auth/auth.module");
const catalog_module_1 = require("./modules/catalog/catalog.module");
const channels_module_1 = require("./modules/channels/channels.module");
const conversations_module_1 = require("./modules/conversations/conversations.module");
const dashboard_module_1 = require("./modules/dashboard/dashboard.module");
const orders_module_1 = require("./modules/orders/orders.module");
const patients_module_1 = require("./modules/patients/patients.module");
const timeline_module_1 = require("./modules/timeline/timeline.module");
const reminders_module_1 = require("./modules/reminders/reminders.module");
const professionals_module_1 = require("./modules/professionals/professionals.module");
const users_module_1 = require("./modules/users/users.module");
const pqrsf_module_1 = require("./modules/pqrsf/pqrsf.module");
const storage_module_1 = require("./modules/storage/storage.module");
const surgeries_module_1 = require("./modules/surgeries/surgeries.module");
const prisma_module_1 = require("./prisma/prisma.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({ isGlobal: true }),
            throttler_1.ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
            schedule_1.ScheduleModule.forRoot(),
            prisma_module_1.PrismaModule,
            audit_module_1.AuditModule,
            automations_module_1.AutomationsModule,
            documents_module_1.DocumentsModule,
            indicators_module_1.IndicatorsModule,
            staff_module_1.StaffModule,
            billing_module_1.BillingModule,
            inventory_module_1.InventoryModule,
            optics_module_1.OpticsModule,
            timeline_module_1.TimelineModule,
            auth_module_1.AuthModule,
            catalog_module_1.CatalogModule,
            channels_module_1.ChannelsModule,
            conversations_module_1.ConversationsModule,
            appointments_module_1.AppointmentsModule,
            patients_module_1.PatientsModule,
            reminders_module_1.RemindersModule,
            dashboard_module_1.DashboardModule,
            ai_module_1.AiModule,
            users_module_1.UsersModule,
            professionals_module_1.ProfessionalsModule,
            orders_module_1.OrdersModule,
            pqrsf_module_1.PqrsfModule,
            storage_module_1.StorageModule,
            surgeries_module_1.SurgeriesModule,
        ],
        controllers: [health_controller_1.HealthController],
        providers: [
            { provide: core_1.APP_GUARD, useClass: throttler_1.ThrottlerGuard },
            { provide: core_1.APP_GUARD, useClass: jwt_auth_guard_1.JwtAuthGuard },
            { provide: core_1.APP_GUARD, useClass: permissions_guard_1.PermissionsGuard },
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map