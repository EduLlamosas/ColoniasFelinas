import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { runAsSuperadmin } from '../src/prisma/tenant-context.js';
import { bootstrapApp } from './utils/bootstrap-app.js';
import { crearAdminDePrueba } from './utils/auth-fixtures.js';
import { cleanDatabase } from './utils/clean-database.js';

const CREATE_ASIGNACION = `
  mutation CreateAsignacion($data: CreateAsignacionInput!) {
    createAsignacion(data: $data) { id voluntarioId coloniaId rolAsignado }
  }
`;

const ASIGNACION_QUERY = `
  query Asignacion($id: ID!) {
    asignacion(id: $id) { rolAsignado }
  }
`;

const UPDATE_ASIGNACION = `
  mutation UpdateAsignacion($id: ID!, $data: UpdateAsignacionInput!) {
    updateAsignacion(id: $id, data: $data) {
      rolAsignado
    }
  }
`;

const REMOVE_VOLUNTARIO = `
  mutation RemoveVoluntario($id: ID!) {
    removeVoluntario(id: $id)
  }
`;

describe('Asignaciones (integración real, e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let token: string;
  let coloniaId: number;
  let voluntarioId: number;
  let asignacionId: string;

  beforeAll(async () => {
    ({ app, prisma } = await bootstrapApp());
    await cleanDatabase(prisma);
    const admin = await crearAdminDePrueba(app, prisma);
    token = admin.token;

    const { colonia, voluntario } = await runAsSuperadmin(async () => ({
      colonia: await prisma.colonia.create({
        data: {
          organizacionId: admin.organizacionId,
          codigoOficial: 'E2E-ASIG-COL',
          nombre: 'Colonia para asignaciones',
          tipoSuelo: 'URBANO',
          latitud: 1,
          longitud: 1,
        },
      }),
      voluntario: await prisma.voluntario.create({
        data: {
          organizacionId: admin.organizacionId,
          dni: '87654321X',
          nombre: 'Voluntario E2E',
          urlCesionDatos: 'https://example.com/cesiones/voluntario-e2e.pdf',
        },
      }),
    }));
    coloniaId = colonia.id;
    voluntarioId = voluntario.id;
  });

  afterAll(async () => {
    await cleanDatabase(prisma);
    await app.close();
  });

  const graphql = (query: string, variables?: Record<string, unknown>) =>
    request(app.getHttpServer()).post('/graphql').send({ query, variables });

  it('createAsignacion persiste, respetando la clave única voluntarioId+coloniaId', async () => {
    const res = await graphql(CREATE_ASIGNACION, {
      data: { voluntarioId, coloniaId, rolAsignado: 'SUPERVISOR' },
    })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.errors).toBeUndefined();
    asignacionId = res.body.data.createAsignacion.id;
    expect(asignacionId).toBeDefined();

    const enBaseDeDatos = await runAsSuperadmin(() =>
      prisma.asignacionVoluntario.findUnique({ where: { id: Number(asignacionId) } }),
    );
    expect(enBaseDeDatos?.rolAsignado).toBe('SUPERVISOR');
  });

  it('asignar el mismo par voluntario+colonia otra vez es un conflicto real (P2002)', async () => {
    const res = await graphql(CREATE_ASIGNACION, {
      data: { voluntarioId, coloniaId, rolAsignado: 'CAPTURADOR' },
    })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.errors?.[0]?.extensions?.code).toBe('CONFLICT');
  });

  it('la query por id devuelve la asignación', async () => {
    const res = await graphql(ASIGNACION_QUERY, { id: asignacionId })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body.data.asignacion.rolAsignado).toBe('SUPERVISOR');
  });

  it('updateAsignacion cambia el rol sin cambiar la identidad de la fila', async () => {
    const res = await graphql(UPDATE_ASIGNACION, {
      id: asignacionId,
      data: { rolAsignado: 'ALIMENTADOR_PRINCIPAL' },
    })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body.data.updateAsignacion.rolAsignado).toBe('ALIMENTADOR_PRINCIPAL');
  });

  it('ON DELETE CASCADE: borrar el voluntario borra también la asignación', async () => {
    await graphql(REMOVE_VOLUNTARIO, { id: voluntarioId })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const enBaseDeDatos = await runAsSuperadmin(() =>
      prisma.asignacionVoluntario.findUnique({ where: { id: Number(asignacionId) } }),
    );
    expect(enBaseDeDatos).toBeNull();
  });
});
