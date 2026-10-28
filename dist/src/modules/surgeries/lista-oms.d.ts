export interface Item {
    clave: string;
    texto: string;
    obligatorio: boolean;
}
export declare const ENTRADA: Item[];
export declare const PAUSA: Item[];
export declare const SALIDA: Item[];
export declare const FASES: {
    readonly ENTRADA: Item[];
    readonly PAUSA: Item[];
    readonly SALIDA: Item[];
};
export type Fase = keyof typeof FASES;
export declare function faltantes(fase: Fase, respuestas: Record<string, unknown>): string[];
