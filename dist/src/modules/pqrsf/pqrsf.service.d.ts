import type { PqrsfEstado, PqrsfTipo, User } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
interface Ctx {
    actor: User;
    ip?: string | null;
}
export declare class PqrsfService {
    private readonly prisma;
    private readonly audit;
    constructor(prisma: PrismaService, audit: AuditService);
    private vencimiento;
    private siguienteRadicado;
    radicar(datos: {
        tipo: PqrsfTipo;
        asunto: string;
        detalle: string;
        personId?: string;
        nombre?: string;
        contacto?: string;
        siteId?: string;
        serviceId?: string;
    }, ctx: Ctx): Promise<{
        id: string;
        tipo: import(".prisma/client").$Enums.PqrsfTipo;
        radicado: string;
        dueDate: Date;
    }>;
    listar(filtro: {
        estado?: PqrsfEstado;
        vencidas?: boolean;
        personId?: string;
    }): import(".prisma/client").Prisma.PrismaPromise<{
        id: string;
        createdAt: Date;
        site: {
            code: string;
        } | null;
        service: {
            name: string;
        } | null;
        person: {
            id: string;
            phone: string | null;
            displayName: string;
        } | null;
        respondedAt: Date | null;
        estado: import(".prisma/client").$Enums.PqrsfEstado;
        nombre: string | null;
        tipo: import(".prisma/client").$Enums.PqrsfTipo;
        radicado: string;
        contacto: string | null;
        asunto: string;
        detalle: string;
        dueDate: Date;
        respuesta: string | null;
        satisfaccion: number | null;
        assignedTo: {
            firstName: string;
            lastName: string;
        } | null;
    }[]>;
    asignar(id: string, userId: string, ctx: Ctx): Promise<{
        id: string;
        personId: string | null;
        estado: import(".prisma/client").$Enums.PqrsfEstado;
        radicado: string;
    }>;
    responder(id: string, respuesta: string, ctx: Ctx): Promise<{
        dentroDePlazo: boolean;
        id: string;
        respondedAt: Date | null;
        estado: import(".prisma/client").$Enums.PqrsfEstado;
        radicado: string;
        dueDate: Date;
    }>;
    cerrar(id: string, satisfaccion: number | undefined, ctx: Ctx): Promise<{
        id: string;
        personId: string | null;
        estado: import(".prisma/client").$Enums.PqrsfEstado;
        radicado: string;
    }>;
    indicadores(): Promise<{
        porTipo: {
            [k: string]: number;
        };
        porEstado: {
            [k: string]: number;
        };
        vencidasSinResponder: number;
        respondidas: number;
        dentroDePlazo: number;
        cumplimiento: number | null;
        satisfaccionMedia: number | null;
    }>;
}
export {};
