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
Object.defineProperty(exports, "__esModule", { value: true });
exports.CatalogController = void 0;
const common_1 = require("@nestjs/common");
const require_permission_decorator_1 = require("../../common/decorators/require-permission.decorator");
const prisma_service_1 = require("../../prisma/prisma.service");
let CatalogController = class CatalogController {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    servicios() {
        return this.prisma.service.findMany({
            where: { isActive: true },
            orderBy: [{ businessLine: 'asc' }, { name: 'asc' }],
            select: {
                id: true,
                code: true,
                name: true,
                slug: true,
                businessLine: true,
                durationMin: true,
                requiredModality: true,
                requiresReferral: true,
                requiresAuthorization: true,
                requiresDilation: true,
                cupsCode: true,
            },
        });
    }
    sedes() {
        return this.prisma.site.findMany({
            where: { isActive: true },
            orderBy: { code: 'asc' },
            select: { id: true, code: true, name: true, city: true, address: true, phone: true },
        });
    }
};
exports.CatalogController = CatalogController;
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('service.read'),
    (0, common_1.Get)('servicios'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], CatalogController.prototype, "servicios", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('site.read'),
    (0, common_1.Get)('sedes'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], CatalogController.prototype, "sedes", null);
exports.CatalogController = CatalogController = __decorate([
    (0, common_1.Controller)('catalogo'),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CatalogController);
//# sourceMappingURL=catalog.controller.js.map