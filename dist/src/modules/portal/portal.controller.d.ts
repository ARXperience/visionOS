import type { Request } from 'express';
import { PortalService } from './portal.service';
declare class ConsultaDto {
    codigo: string;
    ultimos4: string;
}
declare class AccionDto extends ConsultaDto {
    accion: 'confirmar' | 'cancelar';
}
export declare class PortalController {
    private readonly portal;
    constructor(portal: PortalService);
    consultar(dto: ConsultaDto, req: Request): Promise<{
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
    responder(dto: AccionDto, req: Request): Promise<{
        codigo: string;
        estado: string;
        mensaje: string;
    }>;
}
export {};
