import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { bootstrapApp } from './utils/bootstrap-app.js';
import { registerUserOrThrow } from './utils/register-user.js';
import { cleanDatabase } from './utils/clean-database.js';

// depthLimit (ver query-depth-limit.e2e-spec.ts) no frena esto: cientos de alias del mismo campo
// en paralelo no son una query profunda, son ancha. Cada alias dispara su propio findMany() en el
// resolver, así que sin este límite un cliente autenticado podría amplificar el coste de una sola
// petición HTTP con solo repetir el alias las veces que quiera.
const ALIAS_COUNT = 100;
const ALIAS_ATTACK_QUERY = `
  query AliasAttack {
    ${Array.from({ length: ALIAS_COUNT }, (_, i) => `a${i}: colonias { id nombre }`).join('\n    ')}
  }
`;

// La query real más cara del proyecto (gatos, con sus 14 campos) para confirmar que el límite
// no genera un falso positivo contra el uso legítimo.
const GATOS_QUERY = `
  query Gatos {
    gatos {
      id coloniaId nombre sexo fechaNacimiento capaPelaje estadoCer
      observaciones tieneMicrochip numMicrochip marcajeOreja fotoUrl createdAt updatedAt
    }
  }
`;

describe('Límite de complejidad de query (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let token: string;

  beforeAll(async () => {
    ({ app, prisma } = await bootstrapApp());
    await cleanDatabase(prisma);
    ({ token } = await registerUserOrThrow(app));
  });

  afterAll(async () => {
    await cleanDatabase(prisma);
    await app.close();
  });

  const graphql = (query: string, variables?: Record<string, unknown>) =>
    request(app.getHttpServer()).post('/graphql').send({ query, variables });

  it('rechaza una query con muchos alias del mismo campo antes de ejecutar nada', async () => {
    const res = await graphql(ALIAS_ATTACK_QUERY).set('Authorization', `Bearer ${token}`).expect(400);

    expect(res.body.errors).toBeDefined();
    expect(
      res.body.errors.some((e: { message: string }) => /excede la complejidad máxima/.test(e.message)),
    ).toBe(true);
  });

  it('no bloquea la query real más cara del esquema (falso positivo)', async () => {
    const res = await graphql(GATOS_QUERY).set('Authorization', `Bearer ${token}`).expect(200);

    expect(res.body.errors).toBeUndefined();
    expect(res.body.data.gatos).toEqual([]);
  });
});
