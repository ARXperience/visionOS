import { PrismaService } from '../../prisma/prisma.service';
import { AppointmentsService } from '../appointments/appointments.service';
import { AvailabilityService } from '../appointments/availability.service';
import { ConversationsService } from '../conversations/conversations.service';
export declare class AsistenteService {
    private readonly prisma;
    private readonly conversaciones;
    private readonly citas;
    private readonly disponibilidad;
    private readonly logger;
    private readonly modo;
    private readonly presupuestoUsd;
    constructor(prisma: PrismaService, conversaciones: ConversationsService, citas: AppointmentsService, disponibilidad: AvailabilityService);
    get habilitado(): boolean;
    responder(conversationId: string, mensaje: string): Promise<{
        accion: 'ESCALADO' | 'SUGERIDO' | 'ENVIADO' | 'OMITIDO';
        motivo?: string;
    }>;
    private escalar;
    private presupuestoAgotado;
    private llamar;
    private promptActivo;
    private registrar;
}
