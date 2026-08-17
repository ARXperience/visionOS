import { AutomationsService } from './automations.service';
export declare class AutomationsController {
    private readonly automatizaciones;
    constructor(automatizaciones: AutomationsService);
    estado(): Promise<{
        reglas: {
            id: string;
            nombre: string;
            descripcion: string;
            frecuencia: string;
            activa: boolean;
            comprobacion: string;
        }[];
        salud: {
            enCola: number;
            atrasoMinutos: number;
            fallidosUltimos7Dias: number;
        };
    }>;
    envios(limite?: string): import(".prisma/client").Prisma.PrismaPromise<{
        id: string;
        error: string | null;
        appointment: {
            person: {
                phone: string | null;
                displayName: string;
            };
            publicCode: string;
            startsAt: Date;
        };
        sentAt: Date | null;
        outcome: import(".prisma/client").$Enums.NotificationOutcome;
        kind: import(".prisma/client").$Enums.NotificationKind;
        scheduledFor: Date;
    }[]>;
}
