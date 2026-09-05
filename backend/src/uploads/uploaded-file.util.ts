import { unlink } from 'node:fs/promises';
import { join } from 'node:path';

export const UPLOADS_DIR = join(process.cwd(), 'uploads');

/**
 * Borra del disco el fichero de uploads/ al que apunta una URL guardada en un campo tipo
 * fotoUrl/urlCesionDatos, si existe. Pensado para llamarse cuando esa URL deja de estar
 * referenciada (se reemplaza por otra, se limpia el campo, o se borra la entidad entera) -
 * si no, esos ficheros se quedan huérfanos en el volumen para siempre.
 */
export async function deleteUploadedFile(url: string | null | undefined): Promise<void> {
  if (!url) return;

  const filename = url.split('/uploads/').pop();
  if (!filename || filename.includes('/') || filename.includes('..')) return;

  await unlink(join(UPLOADS_DIR, filename)).catch(() => {
    // el fichero ya no está (borrado a mano, o la URL no era una de las nuestras): no es un fallo
  });
}
