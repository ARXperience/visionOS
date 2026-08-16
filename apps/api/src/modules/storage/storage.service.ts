import { randomUUID } from 'node:crypto';

import { GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';

/**
 * Archivos: URL prefirmadas contra Supabase Storage, que habla S3.
 *
 * El archivo va del navegador al almacenamiento SIN pasar por la API. Con una
 * tomografía de 40 MB, hacerlo pasar por Nest significa cargarla entera en
 * memoria del contenedor y multiplicar el tiempo de subida por dos.
 *
 * El bucket es PRIVADO y no se expone nunca una URL pública: un informe de
 * resultado es historia clínica bajo la Res. 1995, y una URL pública es una
 * copia sin auditoría de lectura que sobrevive a cualquier permiso que se
 * revoque después. Cada descarga se firma en el momento, por cinco minutos, y
 * la registra quien la pide.
 */

/** Lo que la clínica sube de verdad. Todo lo demás se rechaza. */
const TIPOS: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/tiff': 'tif',
  // Los equipos de OCT y campimetría exportan DICOM.
  'application/dicom': 'dcm',
};

const MAX_BYTES = 50 * 1024 * 1024;
const VIGENCIA_SEGUNDOS = 300;

@Injectable()
export class StorageService {
  private readonly log = new Logger('Storage');
  private readonly bucket = process.env.S3_BUCKET ?? 'visionos';
  private readonly cliente: S3Client | null;

  constructor() {
    const { S3_ENDPOINT, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY } = process.env;

    // Sin credenciales el sistema arranca igual y solo falla al subir. Que la
    // clínica no pueda entrar a la agenda porque falta una variable de
    // almacenamiento sería el peor intercambio posible.
    if (!S3_ENDPOINT || !S3_ACCESS_KEY_ID || !S3_SECRET_ACCESS_KEY) {
      this.log.warn('Sin credenciales S3: la subida de archivos queda deshabilitada.');
      this.cliente = null;
      return;
    }

    this.cliente = new S3Client({
      endpoint: S3_ENDPOINT,
      region: process.env.S3_REGION ?? 'us-east-2',
      credentials: { accessKeyId: S3_ACCESS_KEY_ID, secretAccessKey: S3_SECRET_ACCESS_KEY },
      // Supabase enruta por ruta, no por subdominio del bucket.
      forcePathStyle: true,
    });
  }

  get habilitado(): boolean {
    return this.cliente !== null;
  }

  private exigirCliente(): S3Client {
    if (!this.cliente) {
      throw new BadRequestException(
        'El almacenamiento de archivos no está configurado en este servidor.',
      );
    }
    return this.cliente;
  }

  /**
   * Firma una subida. Devuelve la clave que hay que guardar en la base, no la
   * URL: la URL caduca en cinco minutos y guardarla dejaría en la ficha del
   * paciente un enlace muerto con una firma dentro.
   */
  async firmarSubida(datos: { nombre: string; tipo: string; bytes: number; carpeta: string }) {
    const cliente = this.exigirCliente();

    const extension = TIPOS[datos.tipo];
    if (!extension) {
      throw new BadRequestException(
        `Tipo de archivo no permitido (${datos.tipo}). Se aceptan: PDF, JPG, PNG, TIFF y DICOM.`,
      );
    }
    if (!Number.isFinite(datos.bytes) || datos.bytes <= 0 || datos.bytes > MAX_BYTES) {
      throw new BadRequestException(`El archivo supera el máximo de ${MAX_BYTES / 1024 / 1024} MB.`);
    }

    // El nombre lo escribe un humano y llega desde el navegador: no se usa
    // para construir la ruta. Un "../" en el nombre escribiría fuera de la
    // carpeta del paciente, encima de un archivo ajeno.
    const carpeta = datos.carpeta.replace(/[^a-zA-Z0-9/_-]/g, '');
    const key = `${carpeta}/${randomUUID()}.${extension}`;

    const url = await getSignedUrl(
      cliente,
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ContentType: datos.tipo,
        ContentLength: datos.bytes,
      }),
      { expiresIn: VIGENCIA_SEGUNDOS },
    );

    return { url, key, expiraEn: VIGENCIA_SEGUNDOS, nombre: datos.nombre };
  }

  /** Firma una descarga. Quien llama es responsable de auditarla. */
  async firmarDescarga(key: string, nombreSugerido?: string) {
    const cliente = this.exigirCliente();

    const url = await getSignedUrl(
      cliente,
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ...(nombreSugerido
          ? { ResponseContentDisposition: `attachment; filename="${nombreSugerido.replace(/"/g, '')}"` }
          : {}),
      }),
      { expiresIn: VIGENCIA_SEGUNDOS },
    );

    return { url, expiraEn: VIGENCIA_SEGUNDOS };
  }

  /**
   * Confirma que el archivo llegó y devuelve su tamaño real.
   *
   * Sin esto, un navegador que pide la firma y nunca sube deja una fila en la
   * base apuntando a un objeto inexistente, y el error aparece meses después
   * cuando alguien abre el resultado.
   */
  async verificar(key: string): Promise<{ bytes: number }> {
    const cliente = this.exigirCliente();
    try {
      const r = await cliente.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
      return { bytes: r.ContentLength ?? 0 };
    } catch {
      throw new NotFoundException('El archivo no llegó al almacenamiento. Vuelva a subirlo.');
    }
  }
}
