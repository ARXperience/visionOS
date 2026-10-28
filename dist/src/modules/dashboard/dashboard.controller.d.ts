import type { User } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
export declare class DashboardController {
    private readonly prisma;
    constructor(prisma: PrismaService);
    hoy(user: User, siteId?: string): Promise<{
        citas: {
            total: number;
            confirmadas: number;
            sinConfirmar: number;
            enSala: number;
            atendiendo: number;
            finalizadas: number;
            noAsistio: number;
            canceladas: number;
        };
        porSede: {
            code: string;
            citas: number;
        }[];
        conversacionesSinResponder: number;
        leadsNuevos: number;
        canales: {
            name: string;
            id: string;
            status: import(".prisma/client").$Enums.ChannelStatus;
            lastError: string | null;
        }[];
        noShowMesAnterior: number | null;
    }>;
}
