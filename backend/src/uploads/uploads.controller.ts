import { randomUUID } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  BadRequestException,
  Controller,
  HttpException,
  Logger,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import sharp from 'sharp';
import { RolUsuario } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { getFreeDiskBytes, UPLOADS_DIR } from './uploaded-file.util.js';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_UPLOAD_SIZE = 8 * 1024 * 1024;
const MAX_WIDTH = 1600;
const WEBP_QUALITY = 80;
// Margen de seguridad reservado para el SO/Postgres/Docker, no para las fotos:
// en un volumen de 40GB esto deja de aceptar subidas a partir de ~38GB usados.
const DEFAULT_MIN_FREE_DISK_MB = 2048;
const INSUFFICIENT_STORAGE = 507;
const SERVICE_UNAVAILABLE = 503;

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RolUsuario.ADMINISTRADOR, RolUsuario.GESTOR)
@Controller('uploads')
export class UploadsController {
  private readonly logger = new Logger(UploadsController.name);

  constructor(private readonly config: ConfigService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      fileFilter: (_req, file, callback) => {
        if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
          callback(
            new BadRequestException('Solo se permiten imágenes JPEG, PNG o WEBP'),
            false,
          );
          return;
        }
        callback(null, true);
      },
      limits: { fileSize: MAX_UPLOAD_SIZE },
    }),
  )
  async upload(@UploadedFile() file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No se ha proporcionado ningún archivo');
    }

    const minFreeBytes =
      (Number(this.config.get<string>('MIN_FREE_DISK_MB')) || DEFAULT_MIN_FREE_DISK_MB) *
      1024 *
      1024;

    let freeBytes: number;
    try {
      freeBytes = await getFreeDiskBytes();
    } catch (error) {
      // Un fallo al consultar el disco (montaje no disponible, permisos...) no debe colarse
      // como un 500 genérico: es un error de infraestructura distinto de "disco lleno", y
      // aquí es donde hay que dejarlo controlado y con traza, antes de arriesgarse a escribir
      // un fichero sin saber si hay sitio.
      this.logger.error('No se pudo comprobar el espacio libre en disco antes de subir', error);
      throw new HttpException(
        'No se pudo comprobar el espacio disponible en el servidor; inténtalo de nuevo en unos minutos',
        SERVICE_UNAVAILABLE,
      );
    }
    if (freeBytes < minFreeBytes) {
      throw new HttpException(
        'Almacenamiento lleno: no se pueden subir más imágenes por ahora',
        INSUFFICIENT_STORAGE,
      );
    }

    let processed: Buffer;
    try {
      processed = await sharp(file.buffer)
        .rotate() // aplica la orientación EXIF a los píxeles antes de que se pierda el metadato
        .resize({ width: MAX_WIDTH, withoutEnlargement: true })
        .webp({ quality: WEBP_QUALITY })
        .toBuffer();
    } catch {
      throw new BadRequestException('No se pudo procesar la imagen');
    }

    const filename = `${randomUUID()}.webp`;
    await writeFile(join(UPLOADS_DIR, filename), processed);

    const appUrl = this.config.getOrThrow<string>('APP_URL');
    return { url: `${appUrl}/uploads/${filename}` };
  }
}
