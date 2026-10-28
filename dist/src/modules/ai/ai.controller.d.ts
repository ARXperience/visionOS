import type { User } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AsistenteService } from './asistente.service';
declare class PublicarPromptDto {
    slug: 'atencion' | 'clasificacion';
    content: string;
    notes?: string;
    activar?: boolean;
}
export declare class AiController {
    private readonly prisma;
    private readonly asistente;
    constructor(prisma: PrismaService, asistente: AsistenteService);
    estado(): Promise<{
        habilitado: boolean;
        modo: string;
        criterioAutonomo: string;
        gastoMesUsd: number;
        presupuestoUsd: number;
        corridasMes: number;
        escaladosMes: number;
        herramientas: string[];
        prompts: {
            id: string;
            createdAt: Date;
            notes: string | null;
            isActive: boolean;
            slug: string;
            version: number;
        }[];
    }>;
    publicar(dto: PublicarPromptDto, user: User): Promise<{
        id: string;
        isActive: boolean;
        slug: string;
        version: number;
    }>;
    activar(dto: {
        id: string;
    }, _user: User): Promise<{
        id: string;
        isActive: boolean;
        slug: string;
        version: number;
    }>;
}
export {};
