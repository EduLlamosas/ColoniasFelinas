import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { runAsSuperadmin } from '../src/prisma/tenant-context.js';
import { bootstrapApp } from './utils/bootstrap-app.js';
import {
  crearAdminDePrueba,
  crearGestorDePrueba,
  crearParticularDePrueba,
} from './utils/auth-fixtures.js';
import { cleanDatabase } from './utils/clean-database.js';

const CREAR_APORTACION = `
  mutation CrearAportacionColonia($data: CreateAportacionColoniaInput!) {
    crearAportacionColonia(data: $data) {
      id
      estado
      motivoRechazo
      gatos { id estado }
    }
  }
`;

const MIS_APORTACIONES = `{ misAportaciones { id nombre estado } }`;

const APORTACIONES_PENDIENTES = `{ aportacionesPendientes { id nombre estado } }`;

const REVISAR_APORTACION = `
  mutation RevisarAportacion($data: RevisarAportacionInput!) {
    revisarAportacion(data: $data) {
      id
      estado
      motivoRechazo
      coloniaCreadaId
      gatos { id estado gatoCreadoId }
    }
  }
`;

const COLONIAS_QUERY = `{ colonias { id nombre } }`;

// Coordenadas de Madrid - dentro del bounding box que usa AportacionFilterService, ver
// aportacion-filter.service.ts.
const coloniaValida = (nombre: string) => ({
  nombre,
  tipoSuelo: 'URBANO',
  latitud: 40.4168,
  longitud: -3.7038,
  gatos: [{ sexo: 'MACHO', capaPelaje: 'Negro', estadoCer: 'AVISTADO' }],
});

describe('Aportaciones de cuentas particulares (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let gestorToken: string;
  let particularAToken: string;
  let particularBToken: string;
  let particularNoVerificadoToken: string;
  let organizacionId: number;

  beforeAll(async () => {
    ({ app, prisma } = await bootstrapApp());
    await cleanDatabase(prisma);

    const admin = await crearAdminDePrueba(app, prisma, { email: 'aportaciones-admin@test.local' });
    adminToken = admin.token;
    organizacionId = admin.organizacionId;

    ({ token: gestorToken } = await crearGestorDePrueba(app, prisma, {
      email: 'aportaciones-gestor@test.local',
      organizacionId,
    }));
    ({ token: particularAToken } = await crearParticularDePrueba(app, prisma, {
      email: 'aportaciones-particular-a@test.local',
      organizacionId,
      emailVerificado: true,
    }));
    ({ token: particularBToken } = await crearParticularDePrueba(app, prisma, {
      email: 'aportaciones-particular-b@test.local',
      organizacionId,
      emailVerificado: true,
    }));
    ({ token: particularNoVerificadoToken } = await crearParticularDePrueba(app, prisma, {
      email: 'aportaciones-particular-sin-verificar@test.local',
      organizacionId,
      emailVerificado: false,
    }));
  });

  afterAll(async () => {
    await cleanDatabase(prisma);
    await app.close();
  });

  const graphql = (query: string, variables: Record<string, unknown>, token: string) =>
    request(app.getHttpServer())
      .post('/graphql')
      .send({ query, variables })
      .set('Authorization', `Bearer ${token}`);

  it('un GESTOR recibe FORBIDDEN - crearAportacionColonia es solo para PARTICULAR', async () => {
    const res = await graphql(CREAR_APORTACION, { data: coloniaValida('X') }, gestorToken).expect(200);
    expect(res.body.errors?.[0]?.extensions?.code).toBe('FORBIDDEN');
  });

  it('una cuenta PARTICULAR sin email verificado recibe FORBIDDEN', async () => {
    const res = await graphql(
      CREAR_APORTACION,
      { data: coloniaValida('X') },
      particularNoVerificadoToken,
    ).expect(200);
    expect(res.body.errors?.[0]?.extensions?.code).toBe('FORBIDDEN');
  });

  let aportacionLimpiaId: number;

  it('PARTICULAR con email verificado crea una aportación con datos limpios: PENDIENTE_MANUAL', async () => {
    const res = await graphql(
      CREAR_APORTACION,
      { data: coloniaValida('Colonia limpia A') },
      particularAToken,
    ).expect(200);

    expect(res.body.errors).toBeUndefined();
    expect(res.body.data.crearAportacionColonia.estado).toBe('PENDIENTE_MANUAL');
    expect(res.body.data.crearAportacionColonia.gatos[0].estado).toBe('PENDIENTE_MANUAL');
    aportacionLimpiaId = Number(res.body.data.crearAportacionColonia.id);
  });

  it('contenido con etiquetas HTML queda RECHAZADA_AUTOMATICA con motivo, sin llegar a un humano', async () => {
    const res = await graphql(
      CREAR_APORTACION,
      { data: { ...coloniaValida('Colonia con ataque A'), observaciones: '<script>alert(1)</script>' } },
      particularAToken,
    ).expect(200);

    expect(res.body.errors).toBeUndefined();
    expect(res.body.data.crearAportacionColonia.estado).toBe('RECHAZADA_AUTOMATICA');
    expect(res.body.data.crearAportacionColonia.motivoRechazo).toEqual(expect.any(String));
  });

  it('misAportaciones: cada PARTICULAR ve solo las suyas, aunque compartan organización', async () => {
    const deA = await graphql(MIS_APORTACIONES, {}, particularAToken).expect(200);
    expect(deA.body.data.misAportaciones).toHaveLength(2);
    expect(deA.body.data.misAportaciones.map((a: { nombre: string }) => a.nombre).sort()).toEqual([
      'Colonia con ataque A',
      'Colonia limpia A',
    ]);

    // La prueba de verdad: B está en la MISMA organización que A, pero RLS (usuario_id = propio,
    // ver la política de aportaciones_colonia) le esconde las de A por completo - no un array
    // vacío por casualidad, sino porque la fila ni siquiera llega desde Postgres.
    const deB = await graphql(MIS_APORTACIONES, {}, particularBToken).expect(200);
    expect(deB.body.data.misAportaciones).toEqual([]);
  });

  it('aportacionesPendientes (GESTOR) solo trae PENDIENTE_MANUAL, nunca la rechazada automáticamente', async () => {
    const res = await graphql(APORTACIONES_PENDIENTES, {}, gestorToken).expect(200);
    const nombres = res.body.data.aportacionesPendientes.map((a: { nombre: string }) => a.nombre);
    expect(nombres).toContain('Colonia limpia A');
    expect(nombres).not.toContain('Colonia con ataque A');
  });

  it('revisarAportacion(aceptar) crea la Colonia y el Gato reales y enlaza sus ids', async () => {
    const res = await graphql(
      REVISAR_APORTACION,
      { data: { id: aportacionLimpiaId, aceptar: true } },
      adminToken,
    ).expect(200);

    expect(res.body.errors).toBeUndefined();
    const aportacion = res.body.data.revisarAportacion;
    expect(aportacion.estado).toBe('ACEPTADA');
    expect(aportacion.coloniaCreadaId).toEqual(expect.any(String));
    expect(aportacion.gatos[0].estado).toBe('ACEPTADA');
    expect(aportacion.gatos[0].gatoCreadoId).toEqual(expect.any(String));

    const coloniaReal = await runAsSuperadmin(() =>
      prisma.colonia.findUnique({ where: { id: Number(aportacion.coloniaCreadaId) } }),
    );
    expect(coloniaReal?.nombre).toBe('Colonia limpia A');
    expect(coloniaReal?.organizacionId).toBe(organizacionId);

    const listado = await graphql(COLONIAS_QUERY, {}, adminToken).expect(200);
    expect(listado.body.data.colonias.map((c: { nombre: string }) => c.nombre)).toContain('Colonia limpia A');
  });

  it('revisarAportacion sobre una aportación ya resuelta es BAD_REQUEST', async () => {
    const res = await graphql(
      REVISAR_APORTACION,
      { data: { id: aportacionLimpiaId, aceptar: true } },
      adminToken,
    ).expect(200);
    expect(res.body.errors?.[0]?.extensions?.code).toBe('BAD_REQUEST');
  });

  it('revisarAportacion(rechazar) marca RECHAZADA_MANUAL con el motivo, sin crear ninguna Colonia', async () => {
    const creada = await graphql(
      CREAR_APORTACION,
      { data: coloniaValida('Colonia limpia B') },
      particularBToken,
    ).expect(200);
    const id = Number(creada.body.data.crearAportacionColonia.id);

    const res = await graphql(
      REVISAR_APORTACION,
      { data: { id, aceptar: false, motivoRechazo: 'No se pudo verificar la ubicación' } },
      adminToken,
    ).expect(200);

    expect(res.body.data.revisarAportacion.estado).toBe('RECHAZADA_MANUAL');
    expect(res.body.data.revisarAportacion.motivoRechazo).toBe('No se pudo verificar la ubicación');
    expect(res.body.data.revisarAportacion.coloniaCreadaId).toBeNull();
    expect(res.body.data.revisarAportacion.gatos[0].estado).toBe('RECHAZADA_MANUAL');
  });

  it('el máximo de colonias aportadas por cuenta (3) se aplica y bloquea la 4ª', async () => {
    // Reutiliza particularB en vez de crear una cuenta nueva: login tiene su propio cupo de
    // 5/minuto/IP COMPARTIDO por todo este fichero (ver GqlThrottlerGuard), y el beforeAll ya
    // gasta 5 logins de fixtures - una 6ª cuenta nueva aquí lo agotaría. La "Colonia limpia B" de
    // este mismo particular ya quedó RECHAZADA_MANUAL en el test anterior y no cuenta para el
    // cupo (ver ESTADOS_QUE_CUENTAN_PARA_CUPO en aportaciones.service.ts), así que parte de 0.
    for (let numero = 1; numero <= 3; numero++) {
      const res = await graphql(
        CREAR_APORTACION,
        { data: coloniaValida(`Colonia cupo ${numero}`) },
        particularBToken,
      ).expect(200);
      expect(res.body.errors).toBeUndefined();
    }

    const cuarta = await graphql(
      CREAR_APORTACION,
      { data: coloniaValida('Colonia cupo 4') },
      particularBToken,
    ).expect(200);
    expect(cuarta.body.errors?.[0]?.extensions?.code).toBe('BAD_REQUEST');
  });
});
