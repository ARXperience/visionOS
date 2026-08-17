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
var AuthService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const jwt_1 = require("@nestjs/jwt");
const node_crypto_1 = require("node:crypto");
const hash_util_1 = require("../../common/utils/hash.util");
const permissions_1 = require("../../common/permissions");
const prisma_service_1 = require("../../prisma/prisma.service");
const audit_service_1 = require("../audit/audit.service");
let AuthService = AuthService_1 = class AuthService {
    prisma;
    jwt;
    config;
    audit;
    logger = new common_1.Logger(AuthService_1.name);
    constructor(prisma, jwt, config, audit) {
        this.prisma = prisma;
        this.jwt = jwt;
        this.config = config;
        this.audit = audit;
    }
    fingerprint(token) {
        return (0, node_crypto_1.createHash)('sha256').update(token).digest('hex');
    }
    refreshSecret() {
        const s = this.config.get('JWT_REFRESH_SECRET');
        if (!s)
            throw new Error('JWT_REFRESH_SECRET es obligatorio');
        return s;
    }
    async validateUser(email, password) {
        const user = await this.prisma.user.findUnique({ where: { email } });
        const hash = user?.passwordHash ?? '$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidin';
        const coincide = await hash_util_1.HashUtil.compare(password, hash);
        if (!user || !coincide || user.status !== 'ACTIVE' || user.deletedAt)
            return null;
        return user;
    }
    async issueTokens(user, ctx) {
        const accessToken = this.jwt.sign({ sub: user.id, email: user.email, role: user.role });
        const refreshToken = this.jwt.sign({ sub: user.id, typ: 'refresh', jti: (0, node_crypto_1.randomBytes)(16).toString('hex') }, {
            secret: this.refreshSecret(),
            expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN') ?? '30d',
        });
        const access = this.jwt.decode(accessToken);
        const refresh = this.jwt.decode(refreshToken);
        await this.prisma.refreshToken.create({
            data: {
                token: this.fingerprint(refreshToken),
                userId: user.id,
                deviceInfo: ctx?.userAgent ?? null,
                ipAddress: ctx?.ip ?? null,
                expiresAt: refresh?.exp
                    ? new Date(refresh.exp * 1000)
                    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            },
        });
        const sites = await this.prisma.userSiteAccess.findMany({
            where: { userId: user.id },
            select: { siteId: true, isPrimary: true },
        });
        return {
            accessToken,
            refreshToken,
            expiresIn: access?.exp ? Math.max(0, access.exp - Math.floor(Date.now() / 1000)) : 900,
            user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
                permissions: [...(0, permissions_1.permissionsOf)(user)],
                siteIds: sites.map((s) => s.siteId),
                primarySiteId: sites.find((s) => s.isPrimary)?.siteId ?? sites[0]?.siteId ?? null,
            },
        };
    }
    async login(user, ctx) {
        const res = await this.issueTokens(user, ctx);
        await this.prisma.user
            .update({
            where: { id: user.id },
            data: { lastLoginAt: new Date(), lastLoginIp: ctx?.ip ?? null },
        })
            .catch((e) => this.logger.warn(`No se registró el último acceso: ${e.message}`));
        await this.audit.record({
            userId: user.id,
            action: 'LOGIN',
            entityType: 'user',
            entityId: user.id,
            ipAddress: ctx?.ip,
            userAgent: ctx?.userAgent,
        });
        return res;
    }
    async recordFailedLogin(email, ctx) {
        await this.audit.record({
            action: 'LOGIN_FAILED',
            entityType: 'user',
            newValues: { email },
            ipAddress: ctx?.ip,
            userAgent: ctx?.userAgent,
        });
    }
    async refresh(refreshToken, ctx) {
        if (!refreshToken)
            throw new common_1.UnauthorizedException('Falta el refresh token');
        let payload;
        try {
            payload = this.jwt.verify(refreshToken, { secret: this.refreshSecret() });
        }
        catch {
            throw new common_1.UnauthorizedException('Refresh token inválido o vencido');
        }
        if (payload.typ !== 'refresh' || !payload.sub) {
            throw new common_1.UnauthorizedException('Refresh token inválido');
        }
        const guardado = await this.prisma.refreshToken.findUnique({
            where: { token: this.fingerprint(refreshToken) },
        });
        if (!guardado || guardado.isRevoked || guardado.userId !== payload.sub) {
            throw new common_1.UnauthorizedException('Refresh token revocado');
        }
        if (guardado.expiresAt.getTime() <= Date.now()) {
            throw new common_1.UnauthorizedException('Refresh token vencido');
        }
        const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
        if (!user || user.deletedAt || user.status !== 'ACTIVE') {
            throw new common_1.UnauthorizedException('Usuario no habilitado');
        }
        await this.prisma.refreshToken.update({
            where: { id: guardado.id },
            data: { isRevoked: true },
        });
        return this.issueTokens(user, {
            ip: ctx?.ip ?? guardado.ipAddress,
            userAgent: ctx?.userAgent ?? guardado.deviceInfo,
        });
    }
    async logout(userId) {
        await this.prisma.refreshToken.updateMany({
            where: { userId, isRevoked: false },
            data: { isRevoked: true },
        });
        await this.audit.record({
            userId,
            action: 'LOGOUT',
            entityType: 'user',
            entityId: userId,
        });
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = AuthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService,
        config_1.ConfigService,
        audit_service_1.AuditService])
], AuthService);
//# sourceMappingURL=auth.service.js.map