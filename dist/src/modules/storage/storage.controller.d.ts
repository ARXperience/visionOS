import { StorageService } from './storage.service';
declare class FirmarSubidaDto {
    nombre: string;
    tipo: string;
    bytes: number;
    destino: 'resultados' | 'documentos' | 'consentimientos';
}
export declare class StorageController {
    private readonly storage;
    constructor(storage: StorageService);
    estado(): {
        habilitado: boolean;
    };
    firmarSubida(dto: FirmarSubidaDto): Promise<{
        url: string;
        key: string;
        expiraEn: number;
        nombre: string;
    }>;
}
export {};
