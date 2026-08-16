import { Body, Controller, Get, Post } from '@nestjs/common';
import { IsIn, IsInt, IsString, MaxLength, Min } from 'class-validator';

import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { StorageService } from './storage.service';

class FirmarSubidaDto {
  @IsString() @MaxLength(255) nombre!: string;
  @IsString() @MaxLength(120) tipo!: string;
  @IsInt() @Min(1) bytes!: number;
  /** Dónde vive el archivo. Cerrado a propósito: no se acepta una ruta libre. */
  @IsIn(['resultados', 'documentos', 'consentimientos']) destino!:
    | 'resultados'
    | 'documentos'
    | 'consentimientos';
}

@Controller('archivos')
export class StorageController {
  constructor(private readonly storage: StorageService) {}

  @Get('estado')
  estado() {
    return { habilitado: this.storage.habilitado };
  }

  @Post('firmar-subida')
  @RequirePermission('patient.write')
  firmarSubida(@Body() dto: FirmarSubidaDto) {
    return this.storage.firmarSubida({
      nombre: dto.nombre,
      tipo: dto.tipo,
      bytes: dto.bytes,
      carpeta: dto.destino,
    });
  }

  // No hay endpoint de descarga por clave. Firmar una clave cualquiera dejaría
  // bajar el examen de cualquier paciente a quien supiera —o adivinara— la
  // ruta, y la auditoría no podría decir de quién era el archivo. Cada módulo
  // firma la descarga desde su propio registro, que sí sabe a qué paciente
  // pertenece: ver OrdersService.verResultado.
}
