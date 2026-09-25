import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { bootstrapApp } from './utils/bootstrap-app.js';
import { crearGestorDePrueba } from './utils/auth-fixtures.js';
import { cleanDatabase } from './utils/clean-database.js';

const LOGIN = `
  mutation Login($data: LoginInput!) {
    login(data: $data) { accessToken usuario { id email rol } }
  }
`;

const ME = `{ me { id email nombreCompleto rol } }`;

// El auto-registro público ya no existe (ver auth.resolver.ts) - las altas reales se cubren en
// usuarios-organizaciones.e2e-spec.ts (crearUsuario/crearOrganizacion). Aquí solo queda lo que
// sigue siendo público de verdad: login y me.
describe('Auth (integración real, e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let email: string;
  const password = 'password123';

  beforeAll(async () => {
    ({ app, prisma } = await bootstrapApp());
    await cleanDatabase(prisma);
    const gestor = await crearGestorDePrueba(app, prisma, { email: 'auth-e2e-1@test.local', password });
    email = gestor.usuario.email;
  });

  afterAll(async () => {
    await cleanDatabase(prisma);
    await app.close();
  });

  const graphql = (query: string, variables?: Record<string, unknown>, token?: string) => {
    const req = request(app.getHttpServer()).post('/graphql').send({ query, variables });
    return token ? req.set('Authorization', `Bearer ${token}`) : req;
  };

  it('login con las credenciales correctas devuelve un token', async () => {
    const res = await graphql(LOGIN, { data: { email, password } }).expect(200);

    expect(res.body.errors).toBeUndefined();
    expect(res.body.data.login.accessToken).toEqual(expect.any(String));
  });

  // INVALID_CREDENTIALS, no UNAUTHENTICATED: ese code lo usan los guards de JWT cuando una
  // sesión YA iniciada deja de ser válida. Un login fallido nunca tuvo sesión que caducar, así
  // que lleva un code propio para que el frontend no muestre "tu sesión ha caducado" aquí.
  it('login con contraseña incorrecta es INVALID_CREDENTIALS, real (bcrypt.compare de verdad)', async () => {
    const res = await graphql(LOGIN, {
      data: { email, password: 'password-equivocada' },
    }).expect(200);

    expect(res.body.errors?.[0]?.extensions?.code).toBe('INVALID_CREDENTIALS');
  });

  it('login con un email que no existe también es INVALID_CREDENTIALS (no revela si el email existe)', async () => {
    const res = await graphql(LOGIN, {
      data: { email: 'no-existe@test.local', password: 'password123' },
    }).expect(200);

    expect(res.body.errors?.[0]?.extensions?.code).toBe('INVALID_CREDENTIALS');
  });

  it('me sin token es UNAUTHENTICATED', async () => {
    const res = await graphql(ME).expect(200);
    expect(res.body.errors?.[0]?.extensions?.code).toBe('UNAUTHENTICATED');
  });

  it('me con token devuelve el perfil y JAMÁS expone passwordHash, ni en bruto', async () => {
    const { token } = await crearGestorDePrueba(app, prisma, { email: 'auth-e2e-3@test.local' });
    const res = await graphql(ME, undefined, token).expect(200);

    expect(res.body.data.me.email).toBe('auth-e2e-3@test.local');
    // No solo que el campo no esté tipado: comprobamos que ni por accidente
    // aparece la palabra en el JSON completo de la respuesta.
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|\$2[aby]\$/);
  });
});
