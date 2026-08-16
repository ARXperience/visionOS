import { BadRequestException } from '@nestjs/common';

import { StorageService } from '../../src/modules/storage/storage.service';

/**
 * Lo que se prueba aquí es el filtro de entrada, no S3: el nombre del archivo
 * y su tipo llegan desde el navegador y no se pueden creer.
 */
describe('firma de subida', () => {
  const storage = new StorageService();
  const base = { nombre: 'informe.pdf', tipo: 'application/pdf', bytes: 1000, carpeta: 'resultados' };

  // Sin credenciales configuradas el servicio se apaga solo; en ese caso las
  // pruebas de validación no aplican porque nada llega a validarse.
  const corre = storage.habilitado ? it : it.skip;

  corre('rechaza un ejecutable', async () => {
    await expect(storage.firmarSubida({ ...base, tipo: 'application/x-msdownload' })).rejects.toThrow(
      BadRequestException,
    );
  });

  corre('rechaza lo que pase de 50 MB', async () => {
    await expect(storage.firmarSubida({ ...base, bytes: 51 * 1024 * 1024 })).rejects.toThrow(
      BadRequestException,
    );
  });

  corre('rechaza tamaño cero o negativo', async () => {
    await expect(storage.firmarSubida({ ...base, bytes: 0 })).rejects.toThrow(BadRequestException);
    await expect(storage.firmarSubida({ ...base, bytes: -5 })).rejects.toThrow(BadRequestException);
  });

  corre('el nombre del archivo NO entra en la ruta', async () => {
    // Un "../" en el nombre escribiría fuera de la carpeta del paciente,
    // encima del archivo de otro. La clave se genera, no se compone.
    const r = await storage.firmarSubida({
      ...base,
      nombre: '../../../etc/passwd.pdf',
    });
    expect(r.key).toMatch(/^resultados\/[0-9a-f-]{36}\.pdf$/);
    expect(r.key).not.toContain('..');
    expect(r.key).not.toContain('passwd');
  });

  corre('una carpeta con travesía se limpia antes de usarse', async () => {
    const r = await storage.firmarSubida({ ...base, carpeta: '../../etc' });
    expect(r.key.startsWith('..')).toBe(false);
  });

  corre('la URL firmada caduca', async () => {
    const r = await storage.firmarSubida(base);
    expect(r.expiraEn).toBeLessThanOrEqual(600);
    expect(r.url).toContain('X-Amz-Signature');
  });
});
