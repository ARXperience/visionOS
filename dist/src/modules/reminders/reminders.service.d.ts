import { PrismaService } from '../../prisma/prisma.service';
import { ConversationsService } from '../conversations/conversations.service';
export declare class RemindersService {
    private readonly prisma;
    private readonly conversaciones;
    private readonly logger;
    private readonly HORA_MIN;
    private readonly HORA_MAX;
    private readonly POR_TANDA;
    constructor(prisma: PrismaService, conversaciones: ConversationsService);
    programar(): Promise<number>;
    enviar(): Promise<number>;
    barrerNoShow(): Promise<number>;
}
