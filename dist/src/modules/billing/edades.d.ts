export type Tramo = 'alDia' | 'd1a30' | 'd31a60' | 'd61a90' | 'mas90';
export declare function tramoDe(dias: number): Tramo;
export declare function diasVencida(dueDate: Date | null, ahora: Date): number;
