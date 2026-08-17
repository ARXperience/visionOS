"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const helmet_1 = __importDefault(require("helmet"));
const app_module_1 = require("./app.module");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.setGlobalPrefix('api');
    app.use((0, helmet_1.default)());
    app.use((0, cookie_parser_1.default)());
    const origenes = (process.env.CORS_ORIGINS ?? '').split(',').map((o) => o.trim()).filter(Boolean);
    if (origenes.length) {
        app.enableCors({
            origin: origenes,
            credentials: true,
            methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['content-type', 'authorization'],
            maxAge: 86_400,
        });
    }
    else if (process.env.NODE_ENV === 'production') {
        console.warn('[main] CORS_ORIGINS vacío y el frontend está en otro dominio: el panel no podrá conectarse.');
    }
    app.set('trust proxy', 1);
    app.useGlobalPipes(new common_1.ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.enableShutdownHooks();
    const port = Number(process.env.API_PORT ?? 3001);
    await app.listen(port);
}
void bootstrap();
//# sourceMappingURL=main.js.map