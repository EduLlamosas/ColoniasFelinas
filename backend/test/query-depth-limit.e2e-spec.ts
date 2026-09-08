import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { bootstrapApp } from './utils/bootstrap-app.js';
import { registerUserOrThrow } from './utils/register-user.js';
import { cleanDatabase } from './utils/clean-database.js';

// La query real más anidada del esquema (registrosClinicos { usuario { ... } }) solo llega a
// profundidad 2 - no hay relaciones cíclicas expuestas todavía, así que no existe ninguna query
// legítima hoy que pueda acercarse al límite de 8. Este ataque se construye con nombres de campo
// inventados: graphql-depth-limit cuenta la forma del AST tal y como lo manda el cliente, sin
// mirar si esos campos existen de verdad en el esquema, así que sirve igual para probar el propio
// mecanismo del límite sin depender de que el esquema tenga (o algún día tenga) anidación real.
const DEEP_ATTACK_QUERY = `
  query DeepAttack {
    a { a { a { a { a { a { a { a { a { a { a } } } } } } } } } }
  }
`;

const REGISTROS_CLINICOS_CON_USUARIO = `
  query RegistrosClinicos($gatoId: Int!) {
    registrosClinicos(gatoId: $gatoId) {
      id
      usuario { id nombreCompleto }
    }
  }
`;

describe('Límite de profundidad de query (e2e)', () => {
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

  it('rechaza una query anidada por encima del límite antes de ejecutar nada', async () => {
    // A diferencia de un error de autorización (que ocurre durante la ejecución y Apollo
    // responde con 200 + errors[]), este es un error de la fase de validación -previo a
    // ejecutar nada- y Apollo lo devuelve como 400.
    const res = await graphql(DEEP_ATTACK_QUERY).set('Authorization', `Bearer ${token}`).expect(400);

    expect(res.body.errors).toBeDefined();
    expect(res.body.errors.some((e: { message: string }) => /exceeds maximum operation depth/.test(e.message))).toBe(true);
  });

  it('no bloquea la query real más anidada del esquema (falso positivo)', async () => {
    const res = await graphql(REGISTROS_CLINICOS_CON_USUARIO, { gatoId: 999_999 })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.errors).toBeUndefined();
    expect(res.body.data.registrosClinicos).toEqual([]);
  });
});
