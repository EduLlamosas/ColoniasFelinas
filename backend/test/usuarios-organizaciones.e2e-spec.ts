import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { bootstrapApp } from './utils/bootstrap-app.js';
import {
  crearAdminDePrueba,
  crearGestorDePrueba,
  crearSuperadminDePrueba,
} from './utils/auth-fixtures.js';
import { cleanDatabase } from './utils/clean-database.js';
import { runAsSuperadmin } from '../src/prisma/tenant-context.js';

const CREAR_ORGANIZACION = `
  mutation CrearOrganizacion($data: CreateOrganizacionInput!) {
    crearOrganizacion(data: $data) {
      organizacion { id nombre slug }
      adminPasswordTemporal
    }
  }
`;

const LOGIN = `
  mutation Login($data: LoginInput!) {
    login(data: $data) { accessToken usuario { rol } }
  }
`;

const CREAR_USUARIO = `
  mutation CrearUsuario($data: CreateUsuarioInput!) {
    crearUsuario(data: $data) { id email rol }
  }
`;

const COLONIAS_QUERY = `{ colonias { id nombre } }`;
const COLONIA_QUERY = `query Colonia($id: ID!) { colonia(id: $id) { id nombre } }`;

// login está limitado a 5 intentos/minuto por IP (ver auth-rate-limit.e2e-spec.ts) - las mismas 5
// cuentas de prueba (creadas UNA vez aquí, no una por test) sirven para todo este fichero, para no
// acercarse a ese límite con altas repetidas que no son lo que se está probando.
describe('Organizaciones y usuarios (integración real, e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let superadmin: Awaited<ReturnType<typeof crearSuperadminDePrueba>>;
  let adminA: Awaited<ReturnType<typeof crearAdminDePrueba>>;
  let gestor: Awaited<ReturnType<typeof crearGestorDePrueba>>;

  beforeAll(async () => {
    ({ app, prisma } = await bootstrapApp());
    await cleanDatabase(prisma);
    superadmin = await crearSuperadminDePrueba(app, prisma);
    adminA = await crearAdminDePrueba(app, prisma);
    gestor = await crearGestorDePrueba(app, prisma);
  });

  afterAll(async () => {
    await cleanDatabase(prisma);
    await app.close();
  });

  const graphql = (query: string, variables: Record<string, unknown>, token?: string) => {
    const req = request(app.getHttpServer()).post('/graphql').send({ query, variables });
    return token ? req.set('Authorization', `Bearer ${token}`) : req;
  };

  describe('crearOrganizacion (alta de un ayuntamiento nuevo)', () => {
    it('rechaza la petición sin token', async () => {
      const res = await graphql(CREAR_ORGANIZACION, {
        data: { nombre: 'X', slug: 'x-sin-token', adminEmail: 'x@test.local', adminNombre: 'X' },
      });
      expect(res.body.errors?.[0]?.extensions?.code).toBe('UNAUTHENTICATED');
    });

    it('un ADMINISTRADOR normal (con organización) recibe FORBIDDEN - no es superadmin', async () => {
      const res = await graphql(
        CREAR_ORGANIZACION,
        { data: { nombre: 'X', slug: 'x-no-superadmin', adminEmail: 'x2@test.local', adminNombre: 'X' } },
        adminA.token,
      ).expect(200);
      expect(res.body.errors?.[0]?.extensions?.code).toBe('FORBIDDEN');
    });

    it('un superadmin crea la organización y su primer admin, que puede loguearse con la contraseña temporal devuelta', async () => {
      const res = await graphql(
        CREAR_ORGANIZACION,
        {
          data: {
            nombre: 'Ayuntamiento E2E',
            slug: 'ayuntamiento-e2e',
            adminEmail: 'admin-nuevo-e2e@test.local',
            adminNombre: 'Admin Nuevo',
          },
        },
        superadmin.token,
      ).expect(200);

      expect(res.body.errors).toBeUndefined();
      const { organizacion, adminPasswordTemporal } = res.body.data.crearOrganizacion;
      expect(organizacion.slug).toBe('ayuntamiento-e2e');
      expect(adminPasswordTemporal).toEqual(expect.any(String));

      // La única llamada a login() de este fichero fuera de las 3 cuentas del beforeAll -
      // imprescindible aquí: es lo único que demuestra que la contraseña temporal devuelta es
      // de verdad utilizable, no solo una cadena con buena pinta en la respuesta.
      const loginRes = await graphql(LOGIN, {
        data: { email: 'admin-nuevo-e2e@test.local', password: adminPasswordTemporal },
      }).expect(200);
      expect(loginRes.body.errors).toBeUndefined();
      expect(loginRes.body.data.login.usuario.rol).toBe('ADMINISTRADOR');
    });

    it('un slug duplicado es un conflicto real (P2002)', async () => {
      const res = await graphql(
        CREAR_ORGANIZACION,
        {
          data: {
            nombre: 'Otro nombre',
            slug: 'ayuntamiento-e2e', // mismo slug que el test anterior
            adminEmail: 'otro-admin@test.local',
            adminNombre: 'Otro',
          },
        },
        superadmin.token,
      ).expect(200);
      expect(res.body.errors?.[0]?.extensions?.code).toBe('CONFLICT');
    });
  });

  describe('crearUsuario (un ADMINISTRADOR invita a alguien a SU organización)', () => {
    it('rechaza la petición sin token', async () => {
      const res = await graphql(CREAR_USUARIO, {
        data: { email: 'y@test.local', password: 'password123', nombreCompleto: 'Y', rol: 'GESTOR' },
      });
      expect(res.body.errors?.[0]?.extensions?.code).toBe('UNAUTHENTICATED');
    });

    it('un GESTOR recibe FORBIDDEN - dar de alta usuarios es cosa de ADMINISTRADOR', async () => {
      const res = await graphql(
        CREAR_USUARIO,
        { data: { email: 'y2@test.local', password: 'password123', nombreCompleto: 'Y', rol: 'GESTOR' } },
        gestor.token,
      ).expect(200);
      expect(res.body.errors?.[0]?.extensions?.code).toBe('FORBIDDEN');
    });

    it('un ADMINISTRADOR crea un usuario, que queda en SU MISMA organización (nunca la que mande el cliente)', async () => {
      const res = await graphql(
        CREAR_USUARIO,
        {
          data: {
            email: 'invitado-e2e@test.local',
            password: 'password123',
            nombreCompleto: 'Invitado',
            rol: 'GESTOR',
          },
        },
        adminA.token,
      ).expect(200);

      expect(res.body.errors).toBeUndefined();
      expect(res.body.data.crearUsuario.rol).toBe('GESTOR');

      const enBaseDeDatos = await runAsSuperadmin(() =>
        prisma.usuario.findUnique({ where: { id: Number(res.body.data.crearUsuario.id) } }),
      );
      expect(enBaseDeDatos?.organizacionId).toBe(adminA.organizacionId);
    });

    it('un email duplicado es un conflicto real (P2002)', async () => {
      const data = {
        email: 'duplicado-e2e@test.local',
        password: 'password123',
        nombreCompleto: 'X',
        rol: 'GESTOR',
      };
      await graphql(CREAR_USUARIO, { data }, adminA.token).expect(200);
      const segunda = await graphql(CREAR_USUARIO, { data }, adminA.token).expect(200);
      expect(segunda.body.errors?.[0]?.extensions?.code).toBe('CONFLICT');
    });
  });

  // El test más importante de este fichero: demuestra contra Postgres real que Row-Level
  // Security aísla los datos entre organizaciones, no solo que el código "debería" filtrarlos -
  // ver la migración multi_tenant_organizaciones y tenant.extension.ts. La organización B se
  // siembra directo en BD (sin login): lo que hace falta probar es que A no la ve, no que B
  // pueda loguearse - eso ya lo cubre sobradamente el resto de la suite.
  describe('Aislamiento entre organizaciones (RLS)', () => {
    it('un ADMINISTRADOR de la organización A no ve ni puede leer por id una colonia de la organización B', async () => {
      const coloniaB = await runAsSuperadmin(async () => {
        const organizacionB = await prisma.organizacion.create({
          data: { nombre: 'Organización B (RLS)', slug: 'org-b-rls-e2e' },
        });
        return prisma.colonia.create({
          data: {
            organizacionId: organizacionB.id,
            codigoOficial: 'E2E-RLS-COL-B',
            nombre: 'Colonia de la organización B',
            tipoSuelo: 'URBANO',
            latitud: 1,
            longitud: 1,
          },
        });
      });

      // A no la ve en su listado...
      const listado = await graphql(COLONIAS_QUERY, {}, adminA.token).expect(200);
      expect(listado.body.data.colonias).toEqual([]);

      // ...ni adivinando su id directamente: NOT_FOUND, exactamente el mismo error que un id que
      // no existiera de verdad - nunca un 403 (eso ya delataría que el id es válido, solo que de
      // otro ayuntamiento). RLS hace que, para A, esa fila simplemente no esté.
      const porId = await graphql(COLONIA_QUERY, { id: String(coloniaB.id) }, adminA.token).expect(200);
      expect(porId.body.errors?.[0]?.extensions?.code).toBe('NOT_FOUND');

      // Para el propio superadmin (bypass de RLS por diseño), la misma query por id sí funciona -
      // confirma que la fila existe de verdad y que lo que la esconde de A es RLS, no un error.
      const porIdParaSuperadmin = await graphql(
        COLONIA_QUERY,
        { id: String(coloniaB.id) },
        superadmin.token,
      ).expect(200);
      expect(porIdParaSuperadmin.body.data.colonia?.nombre).toBe('Colonia de la organización B');
    });
  });
});
