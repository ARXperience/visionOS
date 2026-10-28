import type { AppointmentsService } from '../appointments/appointments.service';
import type { AvailabilityService } from '../appointments/availability.service';
import type { PrismaService } from '../../prisma/prisma.service';
export interface Herramienta {
    nombre: string;
    descripcion: string;
    parametros: Record<string, unknown>;
}
export declare const HERRAMIENTAS: Herramienta[];
export interface ContextoHerramientas {
    prisma: PrismaService;
    citas: AppointmentsService;
    disponibilidad: AvailabilityService;
    conversationId: string;
    personId: string | null;
}
export declare function ejecutar(nombre: string, args: Record<string, unknown>, ctx: ContextoHerramientas): Promise<unknown>;
