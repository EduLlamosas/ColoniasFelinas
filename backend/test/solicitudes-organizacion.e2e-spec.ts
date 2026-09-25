import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { runAsSuperadmin } from '../src/prisma/tenant-context.js';
import { bootstrapApp } from './utils/bootstrap-app.js';
import { crearAdminDePrueba, crearSuperadminDePrueba } from './utils/auth-fixtures.js';
import { cleanDatabase } from './utils/clean-database.js';

const SOLICITAR_ORGANIZACION = `
  mutation SolicitarOrganizacion($data: SolicitarOrganizacionInput!) {
    solicitarOrganizacion(data: $data) { id }
  }
`;

const SOLICITUDES_ORGANIZACION = `
  query Solicitudes($estado: EstadoSolicitud) {
    solicitudesOrganizacion(estado: $estado) { id nombre slug estado }
  }
`;

const APROBAR_SOLICITUD = `
  mutation Aprobar($id: Int!) {
    aprobarSolicitudOrganizacion(id: $id) { id nombre slug }
  }
`;

const RECHAZAR_SOLICITUD = `
  mutation Rechazar($id: Int!, $motivo: String) {
    rechazarSolicitudOrganizacion(id: $id, motivo: $motivo)
  }
`;

describe('Gestión de solicitudes de organización (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let superadminToken: string;
  let adminToken: string;

  beforeAll(async () => {
    ({ app, prisma } = await bootstrapApp());
    await cleanDatabase(prisma);
    ({ token: superadminToken } = await crearSuperadminDePrueba(app, prisma, {
      email: 'solicitudes-superadmin@test.local',
    }));
    ({ token: adminToken } = await crearAdminDePrueba(app, prisma, { email: 'solicitudes-admin@test.local' }));
  });

  afterAll(async () => {
    await cleanDatabase(prisma);
    await app.close();
  });

  const graphql = (query: string, variables: Record<string, unknown>, token?: string) => {
    const req = request(app.getHttpServer()).post('/graphql').send({ query, variables });
    return token ? req.set('Authorization', `Bearer ${token}`) : req;
  };

  it('solicitudesOrganizacion/aprobarSolicitudOrganizacion/rechazarSolicitudOrganizacion son superadmin-only', async () => {
    const lista = await graphql(SOLICITUDES_ORGANIZACION, {}, adminToken).expect(200);
    expect(lista.body.errors?.[0]?.extensions?.code).toBe('FORBIDDEN');

    const aprobar = await graphql(APROBAR_SOLICITUD, { id: 1 }, adminToken).expect(200);
    expect(aprobar.body.errors?.[0]?.extensions?.code).toBe('FORBIDDEN');

    const rechazar = await graphql(RECHAZAR_SOLICITUD, { id: 1 }, adminToken).expect(200);
    expect(rechazar.body.errors?.[0]?.extensions?.code).toBe('FORBIDDEN');
  });

  it('aprobar da de alta la Organizacion + admin real y la solicitud queda como APROBADA', async () => {
    const slug = `aprobada-e2e-${Date.now()}`;
    const email = `contacto-aprobada-e2e-${Date.now()}@test.local`;
    const solicitud = await graphql(
      SOLICITAR_ORGANIZACION,
      { data: { nombre: 'Ayto a aprobar E2E', slug, contactoNombre: 'Luis', contactoEmail: email } },
    ).expect(200);
    const id = Number(solicitud.body.data.solicitarOrganizacion.id);

    const antesDeAprobar = await graphql(SOLICITUDES_ORGANIZACION, { estado: 'PENDIENTE' }, superadminToken).expect(
      200,
    );
    expect(antesDeAprobar.body.data.solicitudesOrganizacion.map((s: { id: string }) => Number(s.id))).toContain(id);

    const res = await graphql(APROBAR_SOLICITUD, { id }, superadminToken).expect(200);
    expect(res.body.errors).toBeUndefined();
    expect(res.body.data.aprobarSolicitudOrganizacion.slug).toBe(slug);

    const solicitudActualizada = await runAsSuperadmin(() =>
      prisma.solicitudOrganizacion.findUnique({ where: { id } }),
    );
    expect(solicitudActualizada?.estado).toBe('APROBADA');
    expect(solicitudActualizada?.organizacionCreadaId).not.toBeNull();

    // La contraseña temporal no viaja en la respuesta de esta mutación (a diferencia de
    // crearOrganizacion) - se manda por email (ver OrganizacionesService#aprobarSolicitud), así
    // que aquí solo queda comprobar que el admin real existe, no intentar loguearse con él.
    const adminCreado = await runAsSuperadmin(() => prisma.usuario.findUnique({ where: { email } }));
    expect(adminCreado?.rol).toBe('ADMINISTRADOR');
    expect(adminCreado?.organizacionId).toBe(solicitudActualizada?.organizacionCreadaId);
  });

  it('rechazar deja la solicitud como RECHAZADA sin crear ninguna Organizacion', async () => {
    const slug = `rechazada-e2e-${Date.now()}`;
    const solicitud = await graphql(SOLICITAR_ORGANIZACION, {
      data: { nombre: 'Ayto a rechazar E2E', slug, contactoNombre: 'Nuria', contactoEmail: 'nuria@rechazo-e2e.test.local' },
    }).expect(200);
    const id = Number(solicitud.body.data.solicitarOrganizacion.id);

    const res = await graphql(RECHAZAR_SOLICITUD, { id, motivo: 'Datos de contacto insuficientes' }, superadminToken).expect(
      200,
    );
    expect(res.body.errors).toBeUndefined();
    expect(res.body.data.rechazarSolicitudOrganizacion).toBe(true);

    const solicitudActualizada = await runAsSuperadmin(() =>
      prisma.solicitudOrganizacion.findUnique({ where: { id } }),
    );
    expect(solicitudActualizada?.estado).toBe('RECHAZADA');
    expect(solicitudActualizada?.organizacionCreadaId).toBeNull();

    const organizacion = await runAsSuperadmin(() => prisma.organizacion.findUnique({ where: { slug } }));
    expect(organizacion).toBeNull();
  });

  it('aprobar/rechazar una solicitud ya resuelta es BAD_REQUEST', async () => {
    const slug = `doble-resolucion-e2e-${Date.now()}`;
    const solicitud = await graphql(SOLICITAR_ORGANIZACION, {
      data: { nombre: 'Ayto doble resolución E2E', slug, contactoNombre: 'Iker', contactoEmail: 'iker@doble-e2e.test.local' },
    }).expect(200);
    const id = Number(solicitud.body.data.solicitarOrganizacion.id);

    await graphql(RECHAZAR_SOLICITUD, { id }, superadminToken).expect(200);
    const segundaVez = await graphql(RECHAZAR_SOLICITUD, { id }, superadminToken).expect(200);
    expect(segundaVez.body.errors?.[0]?.extensions?.code).toBe('BAD_REQUEST');
  });
});
