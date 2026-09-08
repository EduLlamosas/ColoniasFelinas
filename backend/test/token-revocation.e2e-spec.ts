import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { bootstrapApp } from './utils/bootstrap-app.js';
import { registerUserOrThrow } from './utils/register-user.js';
import { cleanDatabase } from './utils/clean-database.js';

const ME = `{ me { id email } }`;

// El escenario real que motiva tokenVersion: un dispositivo con el token guardado se pierde o
// se comparte por error. Sin este campo, la única forma de invalidarlo sería esperar a que
// expire por sí solo (hasta 24h, JWT_EXPIRES_IN) - con él, un solo UPDATE lo revoca al instante,
// sin tocar el JWT_SECRET (que revocaría TODAS las sesiones de TODOS los usuarios a la vez).
describe('Revocación de sesión vía tokenVersion (e2e)', () => {
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

  const graphql = (query: string, token?: string) => {
    const req = request(app.getHttpServer()).post('/graphql').send({ query });
    return token ? req.set('Authorization', `Bearer ${token}`) : req;
  };

  it('un UPDATE que incrementa token_version invalida de golpe un token ya emitido, sin esperar a que expire', async () => {
    const { token, usuario } = await registerUserOrThrow(app, { email: 'revocacion-1@test.local' });

    const antes = await graphql(ME, token).expect(200);
    expect(antes.body.errors).toBeUndefined();
    expect(antes.body.data.me.id).toBe(usuario.id);

    // Simula el "dispositivo perdido": alguien con acceso a la BD revoca la sesión directamente,
    // sin pasar por ninguna mutación de la API (tal y como describe el propio hallazgo).
    await prisma.usuario.update({
      where: { id: Number(usuario.id) },
      data: { tokenVersion: { increment: 1 } },
    });

    const despues = await graphql(ME, token).expect(200);
    expect(despues.body.errors?.[0]?.extensions?.code).toBe('UNAUTHENTICATED');
  });

  it('tras revocar, un login nuevo emite un token con la tokenVersion actualizada y ese sí funciona', async () => {
    const { token: tokenViejo, usuario } = await registerUserOrThrow(app, {
      email: 'revocacion-2@test.local',
      password: 'password123',
    });

    await prisma.usuario.update({
      where: { id: Number(usuario.id) },
      data: { tokenVersion: { increment: 1 } },
    });

    const conTokenViejo = await graphql(ME, tokenViejo).expect(200);
    expect(conTokenViejo.body.errors?.[0]?.extensions?.code).toBe('UNAUTHENTICATED');

    const LOGIN = `
      mutation Login($data: LoginInput!) {
        login(data: $data) { accessToken }
      }
    `;
    const loginRes = await request(app.getHttpServer())
      .post('/graphql')
      .send({ query: LOGIN, variables: { data: { email: 'revocacion-2@test.local', password: 'password123' } } })
      .expect(200);
    const tokenNuevo = loginRes.body.data.login.accessToken as string;

    const conTokenNuevo = await graphql(ME, tokenNuevo).expect(200);
    expect(conTokenNuevo.body.errors).toBeUndefined();
    expect(conTokenNuevo.body.data.me.id).toBe(usuario.id);
  });

  it('un token cuyo usuario ya no existe (cuenta borrada) también es UNAUTHENTICATED', async () => {
    const { token, usuario } = await registerUserOrThrow(app, { email: 'revocacion-3@test.local' });

    await prisma.usuario.delete({ where: { id: Number(usuario.id) } });

    const res = await graphql(ME, token).expect(200);
    expect(res.body.errors?.[0]?.extensions?.code).toBe('UNAUTHENTICATED');
  });
});
