"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageService = void 0;
const node_crypto_1 = require("node:crypto");
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
const common_1 = require("@nestjs/common");
const TIPOS = {
    'application/pdf': 'pdf',
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/tiff': 'tif',
    'application/dicom': 'dcm',
};
const MAX_BYTES = 50 * 1024 * 1024;
const VIGENCIA_SEGUNDOS = 300;
let StorageService = class StorageService {
    log = new common_1.Logger('Storage');
    bucket = process.env.S3_BUCKET ?? 'visionos';
    cliente;
    constructor() {
        const { S3_ENDPOINT, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY } = process.env;
        if (!S3_ENDPOINT || !S3_ACCESS_KEY_ID || !S3_SECRET_ACCESS_KEY) {
            this.log.warn('Sin credenciales S3: la subida de archivos queda deshabilitada.');
            this.cliente = null;
            return;
        }
        this.cliente = new client_s3_1.S3Client({
            endpoint: S3_ENDPOINT,
            region: process.env.S3_REGION ?? 'us-east-2',
            credentials: { accessKeyId: S3_ACCESS_KEY_ID, secretAccessKey: S3_SECRET_ACCESS_KEY },
            forcePathStyle: true,
        });
    }
    get habilitado() {
        return this.cliente !== null;
    }
    exigirCliente() {
        if (!this.cliente) {
            throw new common_1.BadRequestException('El almacenamiento de archivos no está configurado en este servidor.');
        }
        return this.cliente;
    }
    async firmarSubida(datos) {
        const cliente = this.exigirCliente();
        const extension = TIPOS[datos.tipo];
        if (!extension) {
            throw new common_1.BadRequestException(`Tipo de archivo no permitido (${datos.tipo}). Se aceptan: PDF, JPG, PNG, TIFF y DICOM.`);
        }
        if (!Number.isFinite(datos.bytes) || datos.bytes <= 0 || datos.bytes > MAX_BYTES) {
            throw new common_1.BadRequestException(`El archivo supera el máximo de ${MAX_BYTES / 1024 / 1024} MB.`);
        }
        const carpeta = datos.carpeta.replace(/[^a-zA-Z0-9/_-]/g, '');
        const key = `${carpeta}/${(0, node_crypto_1.randomUUID)()}.${extension}`;
        const url = await (0, s3_request_presigner_1.getSignedUrl)(cliente, new client_s3_1.PutObjectCommand({
            Bucket: this.bucket,
            Key: key,
            ContentType: datos.tipo,
            ContentLength: datos.bytes,
        }), { expiresIn: VIGENCIA_SEGUNDOS });
        return { url, key, expiraEn: VIGENCIA_SEGUNDOS, nombre: datos.nombre };
    }
    async firmarDescarga(key, nombreSugerido) {
        const cliente = this.exigirCliente();
        const url = await (0, s3_request_presigner_1.getSignedUrl)(cliente, new client_s3_1.GetObjectCommand({
            Bucket: this.bucket,
            Key: key,
            ...(nombreSugerido
                ? { ResponseContentDisposition: `attachment; filename="${nombreSugerido.replace(/"/g, '')}"` }
                : {}),
        }), { expiresIn: VIGENCIA_SEGUNDOS });
        return { url, expiraEn: VIGENCIA_SEGUNDOS };
    }
    async verificar(key) {
        const cliente = this.exigirCliente();
        try {
            const r = await cliente.send(new client_s3_1.HeadObjectCommand({ Bucket: this.bucket, Key: key }));
            return { bytes: r.ContentLength ?? 0 };
        }
        catch {
            throw new common_1.NotFoundException('El archivo no llegó al almacenamiento. Vuelva a subirlo.');
        }
    }
};
exports.StorageService = StorageService;
exports.StorageService = StorageService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], StorageService);
//# sourceMappingURL=storage.service.js.map