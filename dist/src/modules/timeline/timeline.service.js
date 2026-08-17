"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var TimelineService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TimelineService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let TimelineService = TimelineService_1 = class TimelineService {
    prisma;
    logger = new common_1.Logger(TimelineService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async emitir(e, tx) {
        const cliente = tx ?? this.prisma;
        try {
            await cliente.patientEvent.create({
                data: {
                    personId: e.personId,
                    type: e.type,
                    title: e.title,
                    siteId: e.siteId ?? null,
                    actorUserId: e.actorUserId ?? null,
                    refType: e.refType,
                    refId: e.refId,
                    occurredAt: e.occurredAt ?? new Date(),
                    payload: e.payload ?? {},
                },
            });
        }
        catch (err) {
            if (tx)
                throw err;
            this.logger.error(`No se pudo proyectar ${e.type}: ${err.message}`);
        }
    }
    recorrido(personId, limite = 100) {
        return this.prisma.patientEvent.findMany({
            where: { personId },
            orderBy: { occurredAt: 'desc' },
            take: limite,
            select: {
                id: true,
                type: true,
                title: true,
                occurredAt: true,
                refType: true,
                refId: true,
                payload: true,
                site: { select: { code: true } },
                actor: { select: { firstName: true, lastName: true } },
            },
        });
    }
};
exports.TimelineService = TimelineService;
exports.TimelineService = TimelineService = TimelineService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], TimelineService);
//# sourceMappingURL=timeline.service.js.map