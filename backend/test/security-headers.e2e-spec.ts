import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { bootstrapApp } from './utils/bootstrap-app.js';

const ME_QUERY = `{ me { id } }`;

describe('Cabeceras de seguridad HTTP (helmet, e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    ({ app } = await bootstrapApp());
  });

  afterAll(async () => {
    await app.close();
  });

  it('manda las cabeceras de seguridad básicas de helmet en cualquier respuesta', async () => {
    const res = await request(app.getHttpServer()).post('/graphql').send({ query: ME_QUERY });

    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBeDefined();
  });

  it('crossOriginResourcePolicy es "cross-origin", no el "same-origin" por defecto (para que el frontend en otro dominio pueda cargar /uploads/)', async () => {
    const res = await request(app.getHttpServer()).post('/graphql').send({ query: ME_QUERY });

    expect(res.headers['cross-origin-resource-policy']).toBe('cross-origin');
  });

  it('no manda Content-Security-Policy (esta API no sirve HTML propio, el CSP por defecto no protege nada real aquí)', async () => {
    const res = await request(app.getHttpServer()).post('/graphql').send({ query: ME_QUERY });

    expect(res.headers['content-security-policy']).toBeUndefined();
  });

  it('no manda Strict-Transport-Security fuera de producción (evita el footgun de HSTS bloqueando http://localhost en el navegador)', async () => {
    const res = await request(app.getHttpServer()).post('/graphql').send({ query: ME_QUERY });

    expect(res.headers['strict-transport-security']).toBeUndefined();
  });
});
