// Token de inyección en vez de una clase concreta: qué implementación hay detrás (disco local en
// desarrollo, OVH Object Storage en producción - ver storage.module.ts) es una decisión de
// arranque, no algo que uploads.controller.ts ni los *.service.ts que borran fotos deban conocer.
export const STORAGE_SERVICE = Symbol('STORAGE_SERVICE');

export interface StorageService {
  // key: ruta interna del objeto (p.ej. "org-7/<uuid>.webp") - la decide quien llama, normalmente
  // prefijada por la organización para poder inspeccionar/limpiar por tenant a mano si hiciera
  // falta. Devuelve la URL pública final, la que se guarda en fotoUrl/urlCesionDatos.
  put(key: string, data: Buffer, contentType: string): Promise<string>;

  // Recibe tal cual la URL que devolvió antes put() (la guardada en fotoUrl/urlCesionDatos) y
  // borra el objeto correspondiente. No lanza si la URL es de otro origen/proveedor (datos de
  // ejemplo, una migración a medio hacer) ni si el objeto ya no existe - borrar algo que ya no
  // está no es un fallo real aquí. Devuelve los bytes liberados (0 si no se borró nada de verdad)
  // - MediaService lo usa para descontar la cuota de la organización sin tener que guardar el
  // tamaño de cada fichero en ningún sitio aparte.
  remove(url: string | null | undefined): Promise<number>;
}
