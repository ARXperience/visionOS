import { PrismaService } from '../../prisma/prisma.service';
export interface Hueco {
    inicio: Date;
    fin: Date;
    professionalId: string;
    professionalName: string;
    roomId: string | null;
    equipmentId: string | null;
}
export declare class AvailabilityService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    huecos(params: {
        siteId: string;
        serviceId: string;
        fecha: string;
        professionalId?: string;
    }): Promise<Hueco[]>;
}
export declare function enZona(fecha: string, minutos: number, timezone: string): Date;
