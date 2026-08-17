import { IndicatorsService } from './indicators.service';
export declare class IndicatorsController {
    private readonly indicadores;
    constructor(indicadores: IndicatorsService);
    mensual(desde?: string, hasta?: string, siteId?: string): Promise<{
        periodo: {
            desde: string;
            hasta: string;
        };
        agenda: {
            programadas: number;
            atendidas: number;
            noShow: number;
            canceladas: number;
            tasaNoShow: number | null;
            oportunidadDias: number | null;
            esperaEnSalaMin: number | null;
        };
        clinico: {
            ordenesGeneradas: number;
            cirugias: number;
            conComplicacion: number;
            conPausaRegistrada: number | null;
        };
        dinero: {
            facturado: string;
            recaudado: string;
            porRecaudar: string;
            tasaRecaudo: number | null;
        };
        experiencia: {
            pqrsf: number;
            quejasYReclamos: number;
            felicitaciones: number;
            cumplimientoPlazo: number | null;
            satisfaccionMedia: number | null;
        };
        optica: {
            ordenes: number;
            entregadas: number;
            entregaATiempo: number | null;
        };
        canal: {
            conversacionesNuevas: number;
        };
    }>;
    tendencia(meses?: string, siteId?: string): Promise<{
        mes: string;
        citas: number;
        noShow: number | null;
        oportunidad: number | null;
        facturado: string;
        recaudo: number | null;
        pqrsf: number;
    }[]>;
}
