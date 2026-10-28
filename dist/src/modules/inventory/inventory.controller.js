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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InventoryController = void 0;
const common_1 = require("@nestjs/common");
const class_validator_1 = require("class-validator");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const require_permission_decorator_1 = require("../../common/decorators/require-permission.decorator");
const inventory_service_1 = require("./inventory.service");
const TIPOS = [
    'INSUMO',
    'MEDICAMENTO',
    'MATERIAL_QUIRURGICO',
    'LENTE_INTRAOCULAR',
    'MONTURA',
    'LENTE_OFTALMICO',
    'LENTE_CONTACTO',
    'OTRO',
];
const MOVIMIENTOS = ['ENTRADA', 'SALIDA', 'AJUSTE', 'BAJA'];
class ProductoDto {
    sku;
    name;
    kind;
    brand;
    model;
    unit;
    invima;
    tracksLot;
    minQty;
    salePrice;
    costPrice;
}
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(2),
    (0, class_validator_1.MaxLength)(40),
    __metadata("design:type", String)
], ProductoDto.prototype, "sku", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(2),
    (0, class_validator_1.MaxLength)(160),
    __metadata("design:type", String)
], ProductoDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsIn)(TIPOS),
    __metadata("design:type", String)
], ProductoDto.prototype, "kind", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(80),
    __metadata("design:type", String)
], ProductoDto.prototype, "brand", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(80),
    __metadata("design:type", String)
], ProductoDto.prototype, "model", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(20),
    __metadata("design:type", String)
], ProductoDto.prototype, "unit", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(40),
    __metadata("design:type", String)
], ProductoDto.prototype, "invima", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], ProductoDto.prototype, "tracksLot", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], ProductoDto.prototype, "minQty", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], ProductoDto.prototype, "salePrice", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], ProductoDto.prototype, "costPrice", void 0);
class MovimientoDto {
    productId;
    siteId;
    kind;
    quantity;
    lot;
    expiresAt;
    reason;
    unitCost;
}
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], MovimientoDto.prototype, "productId", void 0);
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], MovimientoDto.prototype, "siteId", void 0);
__decorate([
    (0, class_validator_1.IsIn)(MOVIMIENTOS),
    __metadata("design:type", String)
], MovimientoDto.prototype, "kind", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(100_000),
    __metadata("design:type", Number)
], MovimientoDto.prototype, "quantity", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(80),
    __metadata("design:type", String)
], MovimientoDto.prototype, "lot", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], MovimientoDto.prototype, "expiresAt", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(300),
    __metadata("design:type", String)
], MovimientoDto.prototype, "reason", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], MovimientoDto.prototype, "unitCost", void 0);
class TrasladoDto {
    productId;
    desdeSiteId;
    haciaSiteId;
    quantity;
    lot;
    reason;
}
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], TrasladoDto.prototype, "productId", void 0);
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], TrasladoDto.prototype, "desdeSiteId", void 0);
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], TrasladoDto.prototype, "haciaSiteId", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(100_000),
    __metadata("design:type", Number)
], TrasladoDto.prototype, "quantity", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(80),
    __metadata("design:type", String)
], TrasladoDto.prototype, "lot", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(300),
    __metadata("design:type", String)
], TrasladoDto.prototype, "reason", void 0);
let InventoryController = class InventoryController {
    inventario;
    constructor(inventario) {
        this.inventario = inventario;
    }
    ctx(user, req) {
        return { actor: user, ip: req.ip };
    }
    productos(kind, buscar, incluirInactivos) {
        return this.inventario.productos({ kind, buscar, soloActivos: incluirInactivos !== 'true' });
    }
    crearProducto(dto) {
        return this.inventario.crearProducto(dto);
    }
    alertas(siteId) {
        return this.inventario.alertas(siteId);
    }
    movimientos(productId, siteId, refType, refId) {
        return this.inventario.movimientos({ productId, siteId, refType, refId });
    }
    verificar(siteId) {
        return this.inventario.verificarSaldos(siteId);
    }
    mover(dto, user, req) {
        return this.inventario.mover({ ...dto, expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined }, this.ctx(user, req));
    }
    trasladar(dto, user, req) {
        return this.inventario.trasladar(dto, this.ctx(user, req));
    }
};
exports.InventoryController = InventoryController;
__decorate([
    (0, common_1.Get)('productos'),
    (0, require_permission_decorator_1.RequirePermission)('service.read'),
    __param(0, (0, common_1.Query)('kind')),
    __param(1, (0, common_1.Query)('buscar')),
    __param(2, (0, common_1.Query)('incluirInactivos')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], InventoryController.prototype, "productos", null);
__decorate([
    (0, common_1.Post)('productos'),
    (0, require_permission_decorator_1.RequirePermission)('service.manage'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [ProductoDto]),
    __metadata("design:returntype", void 0)
], InventoryController.prototype, "crearProducto", null);
__decorate([
    (0, common_1.Get)('alertas'),
    (0, require_permission_decorator_1.RequirePermission)('service.read'),
    __param(0, (0, common_1.Query)('siteId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], InventoryController.prototype, "alertas", null);
__decorate([
    (0, common_1.Get)('movimientos'),
    (0, require_permission_decorator_1.RequirePermission)('service.read'),
    __param(0, (0, common_1.Query)('productId')),
    __param(1, (0, common_1.Query)('siteId')),
    __param(2, (0, common_1.Query)('refType')),
    __param(3, (0, common_1.Query)('refId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", void 0)
], InventoryController.prototype, "movimientos", null);
__decorate([
    (0, common_1.Get)('verificar'),
    (0, require_permission_decorator_1.RequirePermission)('service.manage'),
    __param(0, (0, common_1.Query)('siteId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], InventoryController.prototype, "verificar", null);
__decorate([
    (0, common_1.Post)('movimientos'),
    (0, require_permission_decorator_1.RequirePermission)('service.manage'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [MovimientoDto, Object, Object]),
    __metadata("design:returntype", void 0)
], InventoryController.prototype, "mover", null);
__decorate([
    (0, common_1.Post)('traslados'),
    (0, require_permission_decorator_1.RequirePermission)('service.manage'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [TrasladoDto, Object, Object]),
    __metadata("design:returntype", void 0)
], InventoryController.prototype, "trasladar", null);
exports.InventoryController = InventoryController = __decorate([
    (0, common_1.Controller)('inventario'),
    __metadata("design:paramtypes", [inventory_service_1.InventoryService])
], InventoryController);
//# sourceMappingURL=inventory.controller.js.map