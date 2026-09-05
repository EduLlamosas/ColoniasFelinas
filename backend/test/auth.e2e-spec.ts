import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { bootstrapApp } from './utils/bootstrap-app.js';
import { registerUser } from './utils/register-user.js';
import { cleanDatabase } from './utils/clean-database.js';

const LOGIN = `
  mutation Login($data: LoginInput!) {
    login(data: $data) { accessToken usuario { id email rol } }
  }
`;

const ME = `{ me { id email nombreCompleto rol } }`;

describe('Auth (integración real, e2e)', () => {
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

  const graphql = (query: string, variables?: Record<string, unknown>, token?: string) => {
    const req = request(app.getHttpServer()).post('/graphql').send({ query, variables });
    return token ? req.set('Authorization', `Bearer ${token}`) : req;
  };

  it('register crea siempre un GESTOR, nunca deja elegir el rol', async () => {
    const { token, usuario } = await registerUser(app, { email: 'auth-e2e-1@test.local' });
    expect(token).toEqual(expect.any(String));
    expect(usuario.rol).toBe('GESTOR');
  });

  it('register con el mismo email otra vez es un conflicto real (P2002)', async () => {
    const { raw } = await registerUser(app, { email: 'auth-e2e-1@test.local' });
    expect(raw.body.errors?.[0]?.extensions?.code).toBe('CONFLICT');
  });

  it('register con contraseña corta lo rechaza el ValidationPipe real', async () => {
    const { raw } = await registerUser(app, { email: 'auth-e2e-2@test.local', password: 'corta' });
    expect(raw.body.errors?.[0]?.extensions?.code).toBe('BAD_REQUEST');
    expect(raw.body.data).toBeNull();
  });

  it('login con las credenciales correctas devuelve un token', async () => {
    const res = await graphql(LOGIN, {
      data: { email: 'auth-e2e-1@test.local', password: 'password123' },
    }).expect(200);

    expect(res.body.errors).toBeUndefined();
    expect(res.body.data.login.accessToken).toEqual(expect.any(String));
  });

  it('login con contraseña incorrecta es UNAUTHENTICATED, real (bcrypt.compare de verdad)', async () => {
    const res = await graphql(LOGIN, {
      data: { email: 'auth-e2e-1@test.local', password: 'password-equivocada' },
    }).expect(200);

    expect(res.body.errors?.[0]?.extensions?.code).toBe('UNAUTHENTICATED');
  });

  it('login con un email que no existe también es UNAUTHENTICATED (no revela si el email existe)', async () => {
    const res = await graphql(LOGIN, {
      data: { email: 'no-existe@test.local', password: 'password123' },
    }).expect(200);

    expect(res.body.errors?.[0]?.extensions?.code).toBe('UNAUTHENTICATED');
  });

  it('me sin token es UNAUTHENTICATED', async () => {
    const res = await graphql(ME).expect(200);
    expect(res.body.errors?.[0]?.extensions?.code).toBe('UNAUTHENTICATED');
  });

  it('me con token devuelve el perfil y JAMÁS expone passwordHash, ni en bruto', async () => {
    const { token } = await registerUser(app, { email: 'auth-e2e-3@test.local' });
    const res = await graphql(ME, undefined, token).expect(200);

    expect(res.body.data.me.email).toBe('auth-e2e-3@test.local');
    // No solo que el campo no esté tipado: comprobamos que ni por accidente
    // aparece la palabra en el JSON completo de la respuesta.
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|\$2[aby]\$/);
  });
});
