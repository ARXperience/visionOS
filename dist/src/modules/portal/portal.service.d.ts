import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
export declare class PortalService {
    private readonly prisma;
    private readonly audit;
    private readonly log;
    private readonly intentos;
    constructor(prisma: PrismaService, audit: AuditService);
    private frenar;
    consultar(codigo: string, ultimos4: string, ip: string): Promise<{
        codigo: string;
        paciente: string;
        cuando: Date;
        estado: import(".prisma/client").$Enums.AppointmentStatus;
        servicio: string;
        ojo: "OD" | "OI" | "AO" | null;
        preparacion: string | null;
        requiereDilatacion: boolean;
        sede: {
            nombre: string;
            direccion: string;
            telefono: string | null;
        };
        puedeConfirmar: boolean;
        puedeCancelar: boolean;
    }>;
    responder(codigo: string, ultimos4: string, accion: 'confirmar' | 'cancelar', ip: string): Promise<{
        codigo: string;
        estado: string;
        mensaje: string;
    }>;
}
