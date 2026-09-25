import { mkdir, stat, unlink, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { StorageService } from './storage.service.js';

export const UPLOADS_DIR = join(process.cwd(), 'uploads');

// Solo para desarrollo local sin credenciales de OVH configuradas (ver storage.module.ts) - un
// despliegue real usa S3StorageService. Mismo comportamiento que tenía uploads.controller.ts
// antes de esta migración, solo que ahora detrás de la interfaz común StorageService.
@Injectable()
export class LocalStorageService implements StorageService {
  constructor(private readonly config: ConfigService) {}

  async put(key: string, data: Buffer): Promise<string> {
    const destino = join(UPLOADS_DIR, key);
    await mkdir(dirname(destino), { recursive: true });
    await writeFile(destino, data);
    const appUrl = this.config.getOrThrow<string>('APP_URL');
    return `${appUrl}/uploads/${key}`;
  }

  async remove(url: string | null | undefined): Promise<number> {
    if (!url) return 0;
    const key = url.split('/uploads/').pop();
    if (!key || key.includes('..')) return 0;
    const ruta = join(UPLOADS_DIR, key);
    try {
      const info = await stat(ruta);
      await unlink(ruta);
      return info.size;
    } catch {
      // el fichero ya no está (borrado a mano, o la URL no era una de las nuestras): no es un
      // fallo aquí, solo significa que no hay nada que descontar de la cuota.
      return 0;
    }
  }
}
