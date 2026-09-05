import { randomUUID } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  BadRequestException,
  Controller,
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
import { UPLOADS_DIR } from './uploaded-file.util.js';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_UPLOAD_SIZE = 8 * 1024 * 1024;
const MAX_WIDTH = 1600;
const WEBP_QUALITY = 80;

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RolUsuario.ADMINISTRADOR, RolUsuario.GESTOR)
@Controller('uploads')
export class UploadsController {
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
