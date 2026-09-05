vi.mock('node:fs/promises', () => ({
  writeFile: vi.fn().mockResolvedValue(undefined),
}));

import { writeFile } from 'node:fs/promises';
import { BadRequestException } from '@nestjs/common';
import sharp from 'sharp';
import { UploadsController } from './uploads.controller.js';
import type { ConfigService } from '@nestjs/config';

function createConfigMock(appUrl = 'http://localhost:3000') {
  return { getOrThrow: vi.fn().mockReturnValue(appUrl) } as unknown as ConfigService;
}

function createMulterFile(buffer: Buffer, mimetype = 'image/png'): Express.Multer.File {
  return { buffer, mimetype, originalname: 'foto.png' } as Express.Multer.File;
}

describe('UploadsController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lanza BadRequestException si no llega archivo', async () => {
    const controller = new UploadsController(createConfigMock());
    await expect(controller.upload(undefined)).rejects.toThrow(BadRequestException);
  });

  it('lanza BadRequestException si el buffer no es una imagen válida', async () => {
    const controller = new UploadsController(createConfigMock());
    const file = createMulterFile(Buffer.from('esto no es una imagen'));
    await expect(controller.upload(file)).rejects.toThrow(BadRequestException);
  });

  it('redimensiona a 1600px máx, recomprime a WebP y devuelve la URL absoluta', async () => {
    const original = await sharp({
      create: { width: 3000, height: 2000, channels: 3, background: { r: 10, g: 20, b: 30 } },
    })
      .png()
      .toBuffer();

    const controller = new UploadsController(createConfigMock('http://localhost:3000'));
    const result = await controller.upload(createMulterFile(original));

    expect(result.url).toMatch(/^http:\/\/localhost:3000\/uploads\/[\w-]+\.webp$/);
    expect(writeFile).toHaveBeenCalledTimes(1);

    const [, savedBuffer] = vi.mocked(writeFile).mock.calls[0]!;
    const metadata = await sharp(savedBuffer as Buffer).metadata();
    expect(metadata.format).toBe('webp');
    expect(metadata.width).toBe(1600);
  });

  it('no agranda una imagen más pequeña que el ancho máximo', async () => {
    const original = await sharp({
      create: { width: 400, height: 300, channels: 3, background: { r: 1, g: 2, b: 3 } },
    })
      .png()
      .toBuffer();

    const controller = new UploadsController(createConfigMock());
    await controller.upload(createMulterFile(original));

    const [, savedBuffer] = vi.mocked(writeFile).mock.calls[0]!;
    const metadata = await sharp(savedBuffer as Buffer).metadata();
    expect(metadata.width).toBe(400);
    expect(metadata.height).toBe(300);
  });
});
