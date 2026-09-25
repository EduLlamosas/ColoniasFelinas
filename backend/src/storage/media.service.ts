import { randomUUID } from 'node:crypto';
import { HttpException, Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { requireTenantId } from '../prisma/tenant-context.js';
import { STORAGE_SERVICE, type StorageService } from './storage.service.js';

const INSUFFICIENT_STORAGE = 507;

// Configurable por si algún día hay planes con cuotas distintas - de momento, un único valor para
// todas las organizaciones. 2048 MB por defecto: de sobra para el volumen real de fotos de un
// ayuntamiento pequeño/mediano (ver el análisis de precios/planes del proyecto).
export const MAX_STORAGE_MB_POR_ORGANIZACION =
  Number(process.env.MAX_STORAGE_MB_POR_ORGANIZACION) || 2048;

// Capa de negocio sobre StorageService: además de subir/borrar el fichero en sí, mantiene al día
// Organizacion.storageKbUsados, para poder cortar en 507 antes de que una organización pequeña se
// coma sin darse cuenta el disco/bucket que comparte con el resto. organizacionId sale siempre
// del contexto de tenant ambiente (requireTenantId), nunca de un argumento - ni uploads.controller.ts
// ni los *.service.ts que llaman a eliminar() tienen que saber a qué organización pertenece el
// fichero, es siempre la de quien hace la petición.
@Injectable()
export class MediaService {
  constructor(
    @Inject(STORAGE_SERVICE) private readonly storage: StorageService,
    private readonly prisma: PrismaService,
  ) {}

  async subir(carpeta: string, extension: string, data: Buffer, contentType: string): Promise<string> {
    const organizacionId = requireTenantId();
    const kb = Math.ceil(data.length / 1024);

    const organizacion = await this.prisma.organizacion.findUniqueOrThrow({
      where: { id: organizacionId },
      select: { storageKbUsados: true },
    });
    if (organizacion.storageKbUsados + kb > MAX_STORAGE_MB_POR_ORGANIZACION * 1024) {
      throw new HttpException(
        'Almacenamiento lleno: esta organización ha agotado su cuota de fotos',
        INSUFFICIENT_STORAGE,
      );
    }

    const key = `org-${organizacionId}/${carpeta}/${randomUUID()}.${extension}`;
    const url = await this.storage.put(key, data, contentType);
    await this.prisma.organizacion.update({
      where: { id: organizacionId },
      data: { storageKbUsados: { increment: kb } },
    });
    return url;
  }

  // Se llama siempre desde dentro de una petición autenticada normal (update/remove de colonias,
  // gatos, comederos, voluntarios) - nunca hace falta pasarle explícitamente de qué organización
  // es el fichero, RLS ya garantizó que quien llama solo pudo llegar a esta URL a través de un
  // recurso de su propia organización.
  async eliminar(url: string | null | undefined): Promise<void> {
    if (!url) return;
    const bytesLiberados = await this.storage.remove(url);
    if (bytesLiberados === 0) return;

    const organizacionId = requireTenantId();
    const kbLiberados = Math.ceil(bytesLiberados / 1024);
    await this.prisma.organizacion
      .update({
        where: { id: organizacionId },
        data: { storageKbUsados: { decrement: kbLiberados } },
      })
      .catch(() => {
        // Descontar la cuota es una limpieza secundaria - un fallo aquí no debe convertir un
        // borrado que ya tuvo éxito de verdad en un error de cara al usuario.
      });
  }
}
