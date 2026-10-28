export declare class StorageService {
    private readonly log;
    private readonly bucket;
    private readonly cliente;
    constructor();
    get habilitado(): boolean;
    private exigirCliente;
    firmarSubida(datos: {
        nombre: string;
        tipo: string;
        bytes: number;
        carpeta: string;
    }): Promise<{
        url: string;
        key: string;
        expiraEn: number;
        nombre: string;
    }>;
    firmarDescarga(key: string, nombreSugerido?: string): Promise<{
        url: string;
        expiraEn: number;
    }>;
    verificar(key: string): Promise<{
        bytes: number;
    }>;
}
