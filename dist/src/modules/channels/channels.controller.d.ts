import { PrismaService } from '../../prisma/prisma.service';
declare class CrearCanalDto {
    nombre: string;
    siteId?: string;
}
export declare class ChannelsController {
    private readonly prisma;
    constructor(prisma: PrismaService);
    listar(): import(".prisma/client").Prisma.PrismaPromise<{
        name: string;
        id: string;
        status: import(".prisma/client").$Enums.ChannelStatus;
        site: {
            name: string;
            id: string;
            code: string;
        } | null;
        _count: {
            conversations: number;
        };
        phoneNumber: string | null;
        provider: import(".prisma/client").$Enums.ChannelProvider;
        qrExpiresAt: Date | null;
        isDefault: boolean;
        lastConnectedAt: Date | null;
        lastError: string | null;
    }[]>;
    crear(dto: CrearCanalDto): import(".prisma/client").Prisma.Prisma__ChannelClient<{
        name: string;
        id: string;
        status: import(".prisma/client").$Enums.ChannelStatus;
    }, never, import("@prisma/client/runtime/library").DefaultArgs, import(".prisma/client").Prisma.PrismaClientOptions>;
    qr(id: string): Promise<{
        qr: string | null;
        status: import(".prisma/client").$Enums.ChannelStatus;
        expiraEn: Date | null;
    }>;
    conectar(id: string): Promise<{
        ok: boolean;
    }>;
}
export {};
