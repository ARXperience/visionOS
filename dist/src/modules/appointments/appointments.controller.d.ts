import type { AppointmentStatus, User } from '@prisma/client';
import type { Request } from 'express';
import { AppointmentsService } from './appointments.service';
import { AvailabilityService } from './availability.service';
declare class CrearCitaDto {
    siteId: string;
    personId: string;
    serviceId: string;
    professionalId: string;
    roomId?: string;
    equipmentId?: string;
    startsAt: string;
    laterality?: 'OD' | 'OI' | 'AO' | 'NA';
    notes?: string;
}
declare class EstadoDto {
    estado: AppointmentStatus;
    motivo?: string;
    actor?: 'PACIENTE' | 'CLINICA' | 'PROFESIONAL' | 'ASEGURADOR' | 'SISTEMA';
}
export declare class AppointmentsController {
    private readonly citas;
    private readonly disponibilidad;
    constructor(citas: AppointmentsService, disponibilidad: AvailabilityService);
    huecos(siteId: string, serviceId: string, fecha: string, professionalId?: string): Promise<import("./availability.service").Hueco[]>;
    agenda(siteId: string, fecha: string): import(".prisma/client").Prisma.PrismaPromise<{
        id: string;
        status: import(".prisma/client").$Enums.AppointmentStatus;
        service: {
            name: string;
            businessLine: import(".prisma/client").$Enums.BusinessLine;
            requiresDilation: boolean;
        };
        person: {
            id: string;
            phone: string | null;
            displayName: string;
        };
        bookings: {
            professional: {
                displayName: string;
                color: string | null;
            } | null;
        }[];
        notes: string | null;
        publicCode: string;
        startsAt: Date;
        endsAt: Date;
    }[]>;
    crear(dto: CrearCitaDto, user: User, req: Request): Promise<{
        id: string;
        publicCode: string;
        startsAt: Date;
        endsAt: Date;
    }>;
    estado(id: string, dto: EstadoDto, user: User): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.AppointmentStatus;
        publicCode: string;
    }>;
}
export {};
