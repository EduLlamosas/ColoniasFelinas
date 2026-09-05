import { unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import sharp from 'sharp';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { bootstrapApp } from './utils/bootstrap-app.js';
import { registerUserOrThrow } from './utils/register-user.js';
import { cleanDatabase } from './utils/clean-database.js';

describe('Uploads (integración real, e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let token: string;
  const archivosCreados: string[] = [];

  beforeAll(async () => {
    ({ app, prisma } = await bootstrapApp());
    await cleanDatabase(prisma);
    ({ token } = await registerUserOrThrow(app));
  });

  afterAll(async () => {
    await cleanDatabase(prisma);
    // Este endpoint escribe en el uploads/ real del proyecto (no depende de
    // NODE_ENV), así que limpiamos a mano lo que hayamos generado.
    await Promise.all(
      archivosCreados.map((filename) =>
        unlink(join(process.cwd(), 'uploads', filename)).catch(() => undefined),
      ),
    );
    await app.close();
  });

  it('rechaza la subida sin token con un 401 HTTP real (REST, no GraphQL)', async () => {
    await request(app.getHttpServer()).post('/uploads').expect(401);
  });

  it('rechaza si no se manda ningún archivo', async () => {
    const res = await request(app.getHttpServer())
      .post('/uploads')
      .set('Authorization', `Bearer ${token}`)
      .expect(400);
    expect(res.body.message).toMatch(/archivo/i);
  });

  it('rechaza un tipo de archivo no permitido', async () => {
    await request(app.getHttpServer())
      .post('/uploads')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', Buffer.from('esto no es una imagen'), {
        filename: 'documento.txt',
        contentType: 'text/plain',
      })
      .expect(400);
  });

  it('sube una imagen real, la redimensiona/recomprime y la sirve de verdad como estático', async () => {
    const original = await sharp({
      create: { width: 2400, height: 1600, channels: 3, background: { r: 50, g: 80, b: 120 } },
    })
      .png()
      .toBuffer();

    const subida = await request(app.getHttpServer())
      .post('/uploads')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', original, { filename: 'foto.png', contentType: 'image/png' })
      .expect(201);

    expect(subida.body.url).toMatch(/^http:\/\/localhost:3000\/uploads\/[\w-]+\.webp$/);
    const filename = subida.body.url.split('/uploads/')[1];
    archivosCreados.push(filename);

    // GET real contra el propio servidor: la imagen debe descargarse tal cual quedó guardada.
    const rutaRelativa = subida.body.url.replace('http://localhost:3000', '');
    const descarga = await request(app.getHttpServer()).get(rutaRelativa).expect(200);

    expect(descarga.headers['content-type']).toBe('image/webp');
    const metadata = await sharp(descarga.body as Buffer).metadata();
    expect(metadata.format).toBe('webp');
    expect(metadata.width).toBe(1600); // el ancho máximo del pipeline
  });
});
