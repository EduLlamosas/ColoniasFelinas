import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { bootstrapApp } from './utils/bootstrap-app.js';
import { cleanDatabase } from './utils/clean-database.js';

const LOGIN = `
  mutation Login($data: LoginInput!) {
    login(data: $data) { accessToken }
  }
`;

const REGISTER = `
  mutation Register($data: RegisterInput!) {
    register(data: $data) { accessToken }
  }
`;

// register y login tienen cada uno su propio contador (@nestjs/throttler genera la clave a
// partir de IP + clase + nombre del método, ver GqlThrottlerGuard), así que agotar el límite de
// uno no afecta al otro - por eso este archivo va aparte y no comparte fixtures con el resto de
// e2e de auth: necesita empezar cada bucket completamente vacío para poder agotarlo a propósito.
describe('Rate limiting en login/register (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    ({ app, prisma } = await bootstrapApp());
    await cleanDatabase(prisma);
  });

  afterAll(async () => {
    await cleanDatabase(prisma);
    await app.close();
  });

  const graphql = (query: string, variables: Record<string, unknown>) =>
    request(app.getHttpServer()).post('/graphql').send({ query, variables });

  it('bloquea el intento nº6 de login en el mismo minuto desde la misma IP (límite: 5)', async () => {
    const credenciales = { email: 'no-existe-rate-limit@test.local', password: 'password123' };

    for (let intento = 1; intento <= 5; intento++) {
      const res = await graphql(LOGIN, { data: credenciales }).expect(200);
      // Con credenciales inexistentes cada intento es UNAUTHENTICATED, no RATE_LIMITED: el guard
      // todavía deja pasar la petición hasta el resolver.
      expect(res.body.errors?.[0]?.extensions?.code).toBe('UNAUTHENTICATED');
    }

    const sexto = await graphql(LOGIN, { data: credenciales }).expect(200);
    expect(sexto.body.errors?.[0]?.extensions?.code).toBe('RATE_LIMITED');
    expect(sexto.body.errors?.[0]?.extensions?.status).toBe(429);
  });

  it('bloquea el intento nº6 de register en el mismo minuto desde la misma IP (límite: 5), aparte de login', async () => {
    for (let intento = 1; intento <= 5; intento++) {
      const res = await graphql(REGISTER, {
        data: {
          email: `rate-limit-register-${intento}@test.local`,
          password: 'password123',
          nombreCompleto: 'Rate Limit Test',
        },
      }).expect(200);
      expect(res.body.errors).toBeUndefined();
    }

    const sexto = await graphql(REGISTER, {
      data: { email: 'rate-limit-register-6@test.local', password: 'password123', nombreCompleto: 'X' },
    }).expect(200);
    expect(sexto.body.errors?.[0]?.extensions?.code).toBe('RATE_LIMITED');
  });
});
