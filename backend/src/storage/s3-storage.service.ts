import { DeleteObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { StorageService } from './storage.service.js';

// Un año, immutable: el nombre del objeto es un UUID que nunca se reescribe (editar una foto
// sube un objeto NUEVO y borra el viejo, ver *.service.ts) - cachear agresivo es seguro.
const CACHE_CONTROL = 'public, max-age=31536000, immutable';

// OVH Object Storage es compatible con la API S3 - mismo cliente que usaría contra AWS real, solo
// cambia el endpoint. forcePathStyle porque el estilo "virtual-hosted" (bucket como subdominio)
// no está garantizado contra endpoints S3-compatibles que no sean el propio AWS.
@Injectable()
export class S3StorageService implements StorageService {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly publicBaseUrl: string;

  constructor(config: ConfigService) {
    this.bucket = config.getOrThrow<string>('OVH_S3_BUCKET');
    // Si no se da una URL pública propia (p.ej. un alias con CDN delante), se construye a partir
    // del propio endpoint + bucket - válido para el acceso público directo que da OVH de serie.
    this.publicBaseUrl =
      config.get<string>('OVH_S3_PUBLIC_URL') ??
      `${config.getOrThrow<string>('OVH_S3_ENDPOINT').replace(/\/$/, '')}/${this.bucket}`;

    this.client = new S3Client({
      region: config.getOrThrow<string>('OVH_S3_REGION'),
      endpoint: config.getOrThrow<string>('OVH_S3_ENDPOINT'),
      credentials: {
        accessKeyId: config.getOrThrow<string>('OVH_S3_ACCESS_KEY_ID'),
        secretAccessKey: config.getOrThrow<string>('OVH_S3_SECRET_ACCESS_KEY'),
      },
      forcePathStyle: true,
    });
  }

  async put(key: string, data: Buffer, contentType: string): Promise<string> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: data,
        ContentType: contentType,
        ACL: 'public-read',
        CacheControl: CACHE_CONTROL,
      }),
    );
    return `${this.publicBaseUrl}/${key}`;
  }

  async remove(url: string | null | undefined): Promise<number> {
    if (!url || !url.startsWith(this.publicBaseUrl)) return 0;
    const key = url.slice(this.publicBaseUrl.length + 1);
    if (!key) return 0;
    try {
      const cabecera = await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
      await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
      return cabecera.ContentLength ?? 0;
    } catch {
      // el objeto ya no está, o la URL no era de nuestro bucket: no es un fallo aquí, solo
      // significa que no hay nada que descontar de la cuota.
      return 0;
    }
  }
}
