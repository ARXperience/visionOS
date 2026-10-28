import { PrismaService } from '../../prisma/prisma.service';
export declare class AutomationsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
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
    ultimos(limite?: number): import(".prisma/client").Prisma.PrismaPromise<{
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
