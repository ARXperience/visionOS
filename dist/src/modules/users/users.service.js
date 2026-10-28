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
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const hash_util_1 = require("../../common/utils/hash.util");
const prisma_service_1 = require("../../prisma/prisma.service");
const audit_service_1 = require("../audit/audit.service");
let UsersService = class UsersService {
    prisma;
    audit;
    constructor(prisma, audit) {
        this.prisma = prisma;
        this.audit = audit;
    }
    listar() {
        return this.prisma.user.findMany({
            where: { deletedAt: null },
            orderBy: [{ status: 'asc' }, { firstName: 'asc' }],
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                phone: true,
                role: true,
                status: true,
                crossSitePatientRead: true,
                lastLoginAt: true,
                createdAt: true,
                siteAccess: { select: { site: { select: { id: true, code: true } }, isPrimary: true } },
            },
        });
    }
    async crear(datos, ctx) {
        if (!datos.siteIds.length) {
            throw new common_1.BadRequestException('Asigne al menos una sede: sin sede no verá ninguna agenda.');
        }
        try {
            const creado = await this.prisma.user.create({
                data: {
                    email: datos.email.toLowerCase().trim(),
                    passwordHash: await hash_util_1.HashUtil.hash(datos.password),
                    firstName: datos.firstName.trim(),
                    lastName: datos.lastName.trim(),
                    phone: datos.phone,
                    role: datos.role,
                    status: 'ACTIVE',
                    crossSitePatientRead: datos.crossSitePatientRead ?? false,
                    siteAccess: { create: datos.siteIds.map((id, n) => ({ siteId: id, isPrimary: n === 0 })) },
                },
                select: { id: true, email: true, role: true },
            });
            await this.audit.record({
                userId: ctx.actor.id,
                action: 'CREATE',
                entityType: 'user',
                entityId: creado.id,
                newValues: { email: creado.email, role: creado.role },
                ipAddress: ctx.ip,
            });
            return creado;
        }
        catch (e) {
            if (e instanceof client_1.Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
                throw new common_1.ConflictException('Ya existe una cuenta con ese correo.');
            }
            throw e;
        }
    }
    async cambiarClave(id, password, ctx) {
        const usuario = await this.prisma.user.findFirst({
            where: { id, deletedAt: null },
            select: { id: true, email: true },
        });
        if (!usuario)
            throw new common_1.NotFoundException('Usuario no encontrado');
        await this.prisma.$transaction(async (tx) => {
            await tx.user.update({
                where: { id },
                data: { passwordHash: await hash_util_1.HashUtil.hash(password), passwordChangedAt: new Date() },
            });
            await tx.refreshToken.updateMany({
                where: { userId: id, isRevoked: false },
                data: { isRevoked: true },
            });
        });
        await this.audit.record({
            userId: ctx.actor.id,
            action: 'UPDATE',
            entityType: 'user',
            entityId: id,
            newValues: { cambio: 'contraseña', sesionesRevocadas: true },
            ipAddress: ctx.ip,
        });
        return { id, email: usuario.email };
    }
    async actualizar(id, datos, ctx) {
        const antes = await this.prisma.user.findFirst({
            where: { id, deletedAt: null },
            select: { id: true, role: true, email: true, crossSitePatientRead: true },
        });
        if (!antes)
            throw new common_1.NotFoundException('Usuario no encontrado');
        if (datos.role && datos.role !== antes.role)
            await this.protegerUltimoAdmin(id, datos.role);
        const actualizado = await this.prisma.$transaction(async (tx) => {
            const u = await tx.user.update({
                where: { id },
                data: {
                    firstName: datos.firstName,
                    lastName: datos.lastName,
                    phone: datos.phone,
                    role: datos.role,
                    crossSitePatientRead: datos.crossSitePatientRead,
                },
                select: { id: true, email: true, role: true },
            });
            if (datos.siteIds) {
                if (!datos.siteIds.length) {
                    throw new common_1.BadRequestException('Asigne al menos una sede.');
                }
                await tx.userSiteAccess.deleteMany({ where: { userId: id } });
                await tx.userSiteAccess.createMany({
                    data: datos.siteIds.map((s, n) => ({ userId: id, siteId: s, isPrimary: n === 0 })),
                });
            }
            return u;
        });
        await this.audit.record({
            userId: ctx.actor.id,
            action: 'UPDATE',
            entityType: 'user',
            entityId: id,
            oldValues: { role: antes.role, crossSitePatientRead: antes.crossSitePatientRead },
            newValues: { role: actualizado.role, ...(datos.siteIds ? { sedes: datos.siteIds.length } : {}) },
            ipAddress: ctx.ip,
        });
        return actualizado;
    }
    async cambiarEstado(id, activo, ctx) {
        if (id === ctx.actor.id && !activo) {
            throw new common_1.BadRequestException('No puede suspender su propia cuenta.');
        }
        if (!activo)
            await this.protegerUltimoAdmin(id);
        await this.prisma.$transaction(async (tx) => {
            await tx.user.update({ where: { id }, data: { status: activo ? 'ACTIVE' : 'SUSPENDED' } });
            if (!activo) {
                await tx.refreshToken.updateMany({
                    where: { userId: id, isRevoked: false },
                    data: { isRevoked: true },
                });
            }
        });
        await this.audit.record({
            userId: ctx.actor.id,
            action: 'UPDATE',
            entityType: 'user',
            entityId: id,
            newValues: { estado: activo ? 'ACTIVE' : 'SUSPENDED' },
            ipAddress: ctx.ip,
        });
        return { id, status: activo ? 'ACTIVE' : 'SUSPENDED' };
    }
    async darDeBaja(id, ctx) {
        if (id === ctx.actor.id) {
            throw new common_1.BadRequestException('No puede darse de baja a sí mismo.');
        }
        await this.protegerUltimoAdmin(id);
        const usuario = await this.prisma.user.findFirst({
            where: { id, deletedAt: null },
            select: { email: true },
        });
        if (!usuario)
            throw new common_1.NotFoundException('Usuario no encontrado');
        await this.prisma.$transaction(async (tx) => {
            await tx.user.update({
                where: { id },
                data: { status: 'SUSPENDED', deletedAt: new Date() },
            });
            await tx.refreshToken.updateMany({
                where: { userId: id, isRevoked: false },
                data: { isRevoked: true },
            });
            await tx.userSiteAccess.deleteMany({ where: { userId: id } });
        });
        await this.audit.record({
            userId: ctx.actor.id,
            action: 'DELETE',
            entityType: 'user',
            entityId: id,
            oldValues: { email: usuario.email },
            ipAddress: ctx.ip,
        });
        return { id, email: usuario.email, baja: true };
    }
    async protegerUltimoAdmin(id, rolNuevo) {
        const usuario = await this.prisma.user.findUnique({
            where: { id },
            select: { role: true },
        });
        if (usuario?.role !== 'SUPERADMIN')
            return;
        if (rolNuevo === 'SUPERADMIN')
            return;
        const otros = await this.prisma.user.count({
            where: { role: 'SUPERADMIN', status: 'ACTIVE', deletedAt: null, id: { not: id } },
        });
        if (otros === 0) {
            throw new common_1.BadRequestException('Es el único administrador activo. Cree otro antes de quitarle el acceso a este.');
        }
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService])
], UsersService);
//# sourceMappingURL=users.service.js.map