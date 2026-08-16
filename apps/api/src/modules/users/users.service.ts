import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, type UserRole, type User } from '@prisma/client';

import { HashUtil } from '../../common/utils/hash.util';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

interface Ctx {
  actor: User;
  ip?: string | null;
}

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

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

  async crear(
    datos: {
      email: string;
      password: string;
      firstName: string;
      lastName: string;
      phone?: string;
      role: UserRole;
      siteIds: string[];
      crossSitePatientRead?: boolean;
    },
    ctx: Ctx,
  ) {
    // Sin sedes, la cuenta entra pero no ve ninguna agenda. El fallo aparece
    // días después como "a mí no me sale nada" y cuesta relacionarlo.
    if (!datos.siteIds.length) {
      throw new BadRequestException('Asigne al menos una sede: sin sede no verá ninguna agenda.');
    }

    try {
      const creado = await this.prisma.user.create({
        data: {
          email: datos.email.toLowerCase().trim(),
          passwordHash: await HashUtil.hash(datos.password),
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
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('Ya existe una cuenta con ese correo.');
      }
      throw e;
    }
  }

  /**
   * Cambiar la contraseña revoca TODAS las sesiones de esa cuenta.
   *
   * Es el motivo por el que se cambia una contraseña: si alguien la tenía, un
   * token vivo le seguiría dando acceso hasta 30 días. Cambiarla sin revocar
   * da una sensación de seguridad que no existe.
   */
  async cambiarClave(id: string, password: string, ctx: Ctx) {
    const usuario = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, email: true },
    });
    if (!usuario) throw new NotFoundException('Usuario no encontrado');

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id },
        data: { passwordHash: await HashUtil.hash(password), passwordChangedAt: new Date() },
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
      // Nunca la contraseña, ni su hash: el registro dice QUÉ pasó, no el secreto.
      newValues: { cambio: 'contraseña', sesionesRevocadas: true },
      ipAddress: ctx.ip,
    });

    return { id, email: usuario.email };
  }

  async actualizar(
    id: string,
    datos: {
      firstName?: string;
      lastName?: string;
      phone?: string | null;
      role?: UserRole;
      crossSitePatientRead?: boolean;
      siteIds?: string[];
    },
    ctx: Ctx,
  ) {
    const antes = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, role: true, email: true, crossSitePatientRead: true },
    });
    if (!antes) throw new NotFoundException('Usuario no encontrado');

    if (datos.role && datos.role !== antes.role) await this.protegerUltimoAdmin(id, datos.role);

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
          throw new BadRequestException('Asigne al menos una sede.');
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

  /** Suspender corta el acceso ya: se revocan también las sesiones abiertas. */
  async cambiarEstado(id: string, activo: boolean, ctx: Ctx) {
    if (id === ctx.actor.id && !activo) {
      throw new BadRequestException('No puede suspender su propia cuenta.');
    }
    if (!activo) await this.protegerUltimoAdmin(id);

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

  /**
   * Dar de baja NO borra la fila.
   *
   * Un usuario que trabajó dejó registros de auditoría, citas creadas,
   * mensajes enviados y consentimientos capturados. Borrarlo pondría en null
   * el autor de todo eso — justo en las tablas que existen para poder
   * responder quién hizo qué ante la SIC o una auditoría de calidad.
   *
   * Se marca `deletedAt`, se suspende y se revocan sus sesiones: deja de
   * poder entrar y desaparece de las listas, pero su rastro sigue siendo
   * atribuible.
   */
  async darDeBaja(id: string, ctx: Ctx) {
    if (id === ctx.actor.id) {
      throw new BadRequestException('No puede darse de baja a sí mismo.');
    }
    await this.protegerUltimoAdmin(id);

    const usuario = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: { email: true },
    });
    if (!usuario) throw new NotFoundException('Usuario no encontrado');

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

  /**
   * Un sistema sin ningún administrador activo solo se arregla entrando a la
   * base a mano. Con datos de pacientes de por medio, eso no puede depender
   * de que nadie se equivoque en un menú.
   */
  private async protegerUltimoAdmin(id: string, rolNuevo?: UserRole) {
    const usuario = await this.prisma.user.findUnique({
      where: { id },
      select: { role: true },
    });
    if (usuario?.role !== 'SUPERADMIN') return;
    if (rolNuevo === 'SUPERADMIN') return;

    const otros = await this.prisma.user.count({
      where: { role: 'SUPERADMIN', status: 'ACTIVE', deletedAt: null, id: { not: id } },
    });
    if (otros === 0) {
      throw new BadRequestException(
        'Es el único administrador activo. Cree otro antes de quitarle el acceso a este.',
      );
    }
  }
}
