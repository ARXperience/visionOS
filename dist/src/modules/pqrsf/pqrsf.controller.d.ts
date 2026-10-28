import type { PqrsfTipo, User } from '@prisma/client';
import type { Request } from 'express';
import { PqrsfService } from './pqrsf.service';
declare class RadicarDto {
    tipo: PqrsfTipo;
    asunto: string;
    detalle: string;
    personId?: string;
    nombre?: string;
    contacto?: string;
    siteId?: string;
    serviceId?: string;
}
declare class AsignarDto {
    userId: string;
}
declare class ResponderDto {
    respuesta: string;
}
declare class CerrarDto {
    satisfaccion?: number;
}
export declare class PqrsfController {
    private readonly pqrsf;
    constructor(pqrsf: PqrsfService);
    private ctx;
    listar(estado?: string, vencidas?: string, personId?: string): import(".prisma/client").Prisma.PrismaPromise<{
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
    radicar(dto: RadicarDto, user: User, req: Request): Promise<{
        id: string;
        tipo: import(".prisma/client").$Enums.PqrsfTipo;
        radicado: string;
        dueDate: Date;
    }>;
    asignar(id: string, dto: AsignarDto, user: User, req: Request): Promise<{
        id: string;
        personId: string | null;
        estado: import(".prisma/client").$Enums.PqrsfEstado;
        radicado: string;
    }>;
    responder(id: string, dto: ResponderDto, user: User, req: Request): Promise<{
        dentroDePlazo: boolean;
        id: string;
        respondedAt: Date | null;
        estado: import(".prisma/client").$Enums.PqrsfEstado;
        radicado: string;
        dueDate: Date;
    }>;
    cerrar(id: string, dto: CerrarDto, user: User, req: Request): Promise<{
        id: string;
        personId: string | null;
        estado: import(".prisma/client").$Enums.PqrsfEstado;
        radicado: string;
    }>;
}
export {};
