export interface Veredicto {
    escalar: boolean;
    motivo?: string;
}
export declare function exigeHumano(mensaje: string): Veredicto;
export declare function puedeEnviarse(respuesta: string): Veredicto;
export declare const MENSAJE_ESCALADO: string;
export declare function preguntaSiEsBot(mensaje: string): boolean;
export declare const RESPUESTA_SOY_ASISTENTE: string;
