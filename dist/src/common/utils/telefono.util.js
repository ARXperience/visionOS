"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.aE164Colombia = aE164Colombia;
function aE164Colombia(entrada) {
    const escrito = entrada.trim();
    const digitos = escrito.replace(/\D/g, '');
    if (!digitos)
        return null;
    if (escrito.startsWith('+')) {
        return digitos.length >= 8 && digitos.length <= 15 ? `+${digitos}` : null;
    }
    if (digitos.length === 10)
        return `+57${digitos}`;
    if (digitos.length === 12 && digitos.startsWith('57'))
        return `+${digitos}`;
    if (digitos.length >= 13 && digitos.length <= 14 && /^0+57/.test(digitos)) {
        return `+${digitos.replace(/^0+/, '')}`;
    }
    return null;
}
//# sourceMappingURL=telefono.util.js.map