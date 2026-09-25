import { BadRequestException } from '@nestjs/common';
import sharp from 'sharp';
import { UploadsController } from './uploads.controller.js';
import type { MediaService } from '../storage/media.service.js';

function createMediaMock() {
  return { subir: vi.fn().mockResolvedValue('http://localhost:3000/uploads/org-1/fotos/x.webp') };
}

function createMulterFile(buffer: Buffer, mimetype = 'image/png'): Express.Multer.File {
  return { buffer, mimetype, originalname: 'foto.png' } as Express.Multer.File;
}

describe('UploadsController', () => {
  let media: ReturnType<typeof createMediaMock>;

  beforeEach(() => {
    media = createMediaMock();
  });

  it('lanza BadRequestException si no llega archivo', async () => {
    const controller = new UploadsController(media as unknown as MediaService);
    await expect(controller.upload(undefined)).rejects.toThrow(BadRequestException);
  });

  it('lanza BadRequestException si el buffer no es una imagen válida', async () => {
    const controller = new UploadsController(media as unknown as MediaService);
    const file = createMulterFile(Buffer.from('esto no es una imagen'));
    await expect(controller.upload(file)).rejects.toThrow(BadRequestException);
    expect(media.subir).not.toHaveBeenCalled();
  });

  it('redimensiona a 1600px máx, recomprime a WebP y delega en MediaService.subir', async () => {
    const original = await sharp({
      create: { width: 3000, height: 2000, channels: 3, background: { r: 10, g: 20, b: 30 } },
    })
      .png()
      .toBuffer();

    const controller = new UploadsController(media as unknown as MediaService);
    const result = await controller.upload(createMulterFile(original));

    expect(result.url).toBe('http://localhost:3000/uploads/org-1/fotos/x.webp');
    expect(media.subir).toHaveBeenCalledTimes(1);

    const [carpeta, extension, buffer, contentType] = media.subir.mock.calls[0]!;
    expect(carpeta).toBe('fotos');
    expect(extension).toBe('webp');
    expect(contentType).toBe('image/webp');
    const metadata = await sharp(buffer as Buffer).metadata();
    expect(metadata.format).toBe('webp');
    expect(metadata.width).toBe(1600);
  });

  // La cuota de la organización (507 si no cabe) y el proveedor de almacenamiento (OVH/disco
  // local) son responsabilidad de MediaService, no del controlador - ver media.service.spec.ts
  // para esos casos; aquí solo hace falta comprobar que el error se propaga sin más.
  it('propaga el error de MediaService.subir (p.ej. cuota agotada) sin envolverlo', async () => {
    media.subir.mockRejectedValueOnce(new Error('cuota agotada'));
    const controller = new UploadsController(media as unknown as MediaService);
    const original = await sharp({
      create: { width: 400, height: 300, channels: 3, background: { r: 1, g: 2, b: 3 } },
    })
      .png()
      .toBuffer();

    await expect(controller.upload(createMulterFile(original))).rejects.toThrow('cuota agotada');
  });

  it('no agranda una imagen más pequeña que el ancho máximo', async () => {
    const original = await sharp({
      create: { width: 400, height: 300, channels: 3, background: { r: 1, g: 2, b: 3 } },
    })
      .png()
      .toBuffer();

    const controller = new UploadsController(media as unknown as MediaService);
    await controller.upload(createMulterFile(original));

    const [, , buffer] = media.subir.mock.calls[0]!;
    const metadata = await sharp(buffer as Buffer).metadata();
    expect(metadata.width).toBe(400);
    expect(metadata.height).toBe(300);
  });
});
