"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tramoDe = tramoDe;
exports.diasVencida = diasVencida;
function tramoDe(dias) {
    if (dias <= 0)
        return 'alDia';
    if (dias <= 30)
        return 'd1a30';
    if (dias <= 60)
        return 'd31a60';
    if (dias <= 90)
        return 'd61a90';
    return 'mas90';
}
function diasVencida(dueDate, ahora) {
    if (!dueDate)
        return 0;
    return Math.floor((ahora.getTime() - dueDate.getTime()) / 86_400_000);
}
//# sourceMappingURL=edades.js.map