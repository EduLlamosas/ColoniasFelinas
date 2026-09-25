import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SkipThrottle } from '@nestjs/throttler';
import { memoryStorage } from 'multer';
import sharp from 'sharp';
import { RolUsuario } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { UploadsThrottlerGuard } from './guards/uploads-throttler.guard.js';
import { MediaService } from '../storage/media.service.js';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_UPLOAD_SIZE = 8 * 1024 * 1024;
const MAX_WIDTH = 1600;
const WEBP_QUALITY = 80;

// SkipThrottle({ default: true }): sin esto, el tier "default" (5/minuto, pensado para
// login) también se aplicaría aquí y bloquearía una sesión normal de subida de varias fotos
// seguidas - esta ruta solo debe medirse contra el tier "uploads" (ver app.module.ts).
@UseGuards(JwtAuthGuard, RolesGuard, UploadsThrottlerGuard)
@SkipThrottle({ default: true })
@Roles(RolUsuario.ADMINISTRADOR, RolUsuario.GESTOR)
@Controller('uploads')
export class UploadsController {
  constructor(private readonly media: MediaService) {}

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

    // MediaService comprueba la cuota de la organización (507 si no cabe) y sube al backend de
    // almacenamiento configurado (OVH en producción, disco local en desarrollo - ver
    // storage.module.ts) antes de devolver la URL pública.
    const url = await this.media.subir('fotos', 'webp', processed, 'image/webp');
    return { url };
  }
}
