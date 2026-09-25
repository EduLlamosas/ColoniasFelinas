import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { runAsSuperadmin } from '../src/prisma/tenant-context.js';
import { bootstrapApp } from './utils/bootstrap-app.js';
import { crearOrganizacionDePrueba } from './utils/auth-fixtures.js';
import { cleanDatabase } from './utils/clean-database.js';

const ORGANIZACIONES_PUBLICAS = `{ organizacionesPublicas { id nombre slug } }`;

const SOLICITAR_ORGANIZACION = `
  mutation SolicitarOrganizacion($data: SolicitarOrganizacionInput!) {
    solicitarOrganizacion(data: $data) { id nombre slug estado }
  }
`;

const REGISTRAR_PARTICULAR = `
  mutation RegistrarParticular($data: RegistrarParticularInput!) {
    registrarParticular(data: $data) { email emailVerificacionEnviado }
  }
`;

const VERIFICAR_EMAIL = `
  mutation VerificarEmail($token: String!) {
    verificarEmail(token: $token)
  }
`;

const LOGIN = `
  mutation Login($data: LoginInput!) {
    login(data: $data) { accessToken usuario { rol } }
  }
`;

// Cada mutación/query de este resolver tiene su PROPIO cupo de 5 peticiones/minuto/IP (ver
// GqlThrottlerGuard#generateKey: la clave incluye el nombre del handler, no solo la IP) - así que
// no hace falta repartir un presupuesto compartido entre los 4 tests de este fichero, cada uno
// tiene el suyo.
describe('Registro público (e2e)', () => {
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

  it('organizacionesPublicas lista solo organizaciones activas, sin autenticación', async () => {
    const activa = await crearOrganizacionDePrueba(prisma, 'Ayuntamiento Activo E2E');
    const inactiva = await runAsSuperadmin(() =>
      prisma.organizacion.create({
        data: { nombre: 'Ayuntamiento Inactivo E2E', slug: `inactivo-e2e-${Date.now()}`, activo: false },
      }),
    );

    const res = await graphql(ORGANIZACIONES_PUBLICAS, {}).expect(200);

    expect(res.body.errors).toBeUndefined();
    const slugs = res.body.data.organizacionesPublicas.map((o: { slug: string }) => o.slug);
    expect(slugs).toContain(activa.slug);
    expect(slugs).not.toContain(inactiva.slug);
  });

  it('solicitarOrganizacion crea una solicitud PENDIENTE sin dar de alta ninguna Organizacion real', async () => {
    const slug = `solicitud-e2e-${Date.now()}`;
    const res = await graphql(SOLICITAR_ORGANIZACION, {
      data: {
        nombre: 'Ayuntamiento Solicitante E2E',
        slug,
        contactoNombre: 'Marta',
        contactoEmail: 'marta@solicitante-e2e.test.local',
      },
    }).expect(200);

    expect(res.body.errors).toBeUndefined();
    expect(res.body.data.solicitarOrganizacion.estado).toBe('PENDIENTE');

    const enBaseDeDatos = await runAsSuperadmin(() => prisma.organizacion.findUnique({ where: { slug } }));
    expect(enBaseDeDatos).toBeNull();
  });

  it('registrarParticular crea la cuenta sin email verificado y ligada a la organización elegida', async () => {
    const organizacion = await crearOrganizacionDePrueba(prisma, 'Ayuntamiento para particulares E2E');
    const email = `particular-e2e-${Date.now()}@test.local`;

    const res = await graphql(REGISTRAR_PARTICULAR, {
      data: {
        email,
        password: 'password123',
        nombreCompleto: 'Particular E2E',
        organizacionSlug: organizacion.slug,
      },
    }).expect(200);

    expect(res.body.errors).toBeUndefined();
    expect(res.body.data.registrarParticular).toEqual({ email, emailVerificacionEnviado: true });

    const usuario = await runAsSuperadmin(() => prisma.usuario.findUnique({ where: { email } }));
    expect(usuario?.rol).toBe('PARTICULAR');
    expect(usuario?.organizacionId).toBe(organizacion.id);
    expect(usuario?.emailVerificado).toBe(false);
    expect(usuario?.tokenVerificacionEmail).toEqual(expect.any(String));

    // El login funciona igualmente sin verificar (solo aportar colonias lo exige, ver
    // aportaciones.e2e-spec.ts) - emailVerificado no es una condición para poder autenticarse.
    const loginRes = await graphql(LOGIN, { data: { email, password: 'password123' } }).expect(200);
    expect(loginRes.body.data.login.usuario.rol).toBe('PARTICULAR');
  });

  it('verificarEmail consume el token real y activa la cuenta', async () => {
    const organizacion = await crearOrganizacionDePrueba(prisma, 'Ayuntamiento verificación E2E');
    const email = `verificar-e2e-${Date.now()}@test.local`;
    await graphql(REGISTRAR_PARTICULAR, {
      data: { email, password: 'password123', nombreCompleto: 'X', organizacionSlug: organizacion.slug },
    }).expect(200);

    const usuario = await runAsSuperadmin(() => prisma.usuario.findUnique({ where: { email } }));
    const token = usuario!.tokenVerificacionEmail!;

    const res = await graphql(VERIFICAR_EMAIL, { token }).expect(200);
    expect(res.body.errors).toBeUndefined();
    expect(res.body.data.verificarEmail).toBe(true);

    const actualizado = await runAsSuperadmin(() => prisma.usuario.findUnique({ where: { email } }));
    expect(actualizado?.emailVerificado).toBe(true);
    expect(actualizado?.tokenVerificacionEmail).toBeNull();

    // Un token ya consumido (o cualquiera que no exista) es un error de negocio claro, no un 500.
    const reintento = await graphql(VERIFICAR_EMAIL, { token }).expect(200);
    expect(reintento.body.errors?.[0]?.extensions?.code).toBe('BAD_REQUEST');
  });
});
