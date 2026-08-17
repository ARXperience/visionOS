"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.claveDesdeEntorno = claveDesdeEntorno;
exports.cifrar = cifrar;
exports.descifrar = descifrar;
exports.igualSeguro = igualSeguro;
const node_crypto_1 = require("node:crypto");
const ALGORITMO = 'aes-256-gcm';
const IV_BYTES = 12;
function claveDesdeEntorno(nombre = 'WHATSAPP_AUTH_ENCRYPTION_KEY') {
    const hex = process.env[nombre];
    if (!hex)
        throw new Error(`Falta ${nombre}. Generar con: openssl rand -hex 32`);
    const clave = Buffer.from(hex, 'hex');
    if (clave.length !== 32) {
        throw new Error(`${nombre} debe ser de 32 bytes (64 caracteres hex), no ${clave.length}`);
    }
    return clave;
}
function cifrar(texto, clave) {
    if (clave.length !== 32)
        throw new Error('La clave debe ser de 32 bytes');
    const iv = (0, node_crypto_1.randomBytes)(IV_BYTES);
    const cifrador = (0, node_crypto_1.createCipheriv)(ALGORITMO, clave, iv);
    const datos = Buffer.concat([cifrador.update(texto, 'utf8'), cifrador.final()]);
    return [iv.toString('base64'), cifrador.getAuthTag().toString('base64'), datos.toString('base64')].join('.');
}
function descifrar(paquete, clave) {
    const partes = paquete.split('.');
    if (partes.length !== 3)
        throw new Error('Formato de cifrado inválido');
    const [iv, tag, datos] = partes.map((p) => Buffer.from(p, 'base64'));
    if (iv.length !== IV_BYTES)
        throw new Error('IV inválido');
    const descifrador = (0, node_crypto_1.createDecipheriv)(ALGORITMO, clave, iv);
    descifrador.setAuthTag(tag);
    return Buffer.concat([descifrador.update(datos), descifrador.final()]).toString('utf8');
}
function igualSeguro(a, b) {
    const ba = Buffer.from(a);
    const bb = Buffer.from(b);
    return ba.length === bb.length && (0, node_crypto_1.timingSafeEqual)(ba, bb);
}
//# sourceMappingURL=cifrado.util.js.map