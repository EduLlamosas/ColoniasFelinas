import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { bootstrapApp } from './utils/bootstrap-app.js';
import { registerUserOrThrow } from './utils/register-user.js';
import { cleanDatabase } from './utils/clean-database.js';

const CREATE_ASIGNACION = `
  mutation CreateAsignacion($data: CreateAsignacionInput!) {
    createAsignacion(data: $data) { voluntarioId coloniaId rolAsignado }
  }
`;

const ASIGNACION_QUERY = `
  query Asignacion($voluntarioId: Int!, $coloniaId: Int!) {
    asignacion(voluntarioId: $voluntarioId, coloniaId: $coloniaId) { rolAsignado }
  }
`;

const UPDATE_ASIGNACION = `
  mutation UpdateAsignacion($voluntarioId: Int!, $coloniaId: Int!, $data: UpdateAsignacionInput!) {
    updateAsignacion(voluntarioId: $voluntarioId, coloniaId: $coloniaId, data: $data) {
      rolAsignado
    }
  }
`;

const REMOVE_VOLUNTARIO = `
  mutation RemoveVoluntario($id: ID!) {
    removeVoluntario(id: $id) { id }
  }
`;

describe('Asignaciones (integración real, e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let token: string;
  let coloniaId: number;
  let voluntarioId: number;

  beforeAll(async () => {
    ({ app, prisma } = await bootstrapApp());
    await cleanDatabase(prisma);
    ({ token } = await registerUserOrThrow(app));

    const colonia = await prisma.colonia.create({
      data: {
        codigoOficial: 'E2E-ASIG-COL',
        nombre: 'Colonia para asignaciones',
        tipoSuelo: 'URBANO',
        latitud: 1,
        longitud: 1,
      },
    });
    coloniaId = colonia.id;

    const voluntario = await prisma.voluntario.create({
      data: {
        dni: '87654321X',
        nombre: 'Voluntario E2E',
        urlCesionDatos: 'https://example.com/cesiones/voluntario-e2e.pdf',
      },
    });
    voluntarioId = voluntario.id;
  });

  afterAll(async () => {
    await cleanDatabase(prisma);
    await app.close();
  });

  const graphql = (query: string, variables?: Record<string, unknown>) =>
    request(app.getHttpServer()).post('/graphql').send({ query, variables });

  it('createAsignacion persiste con la clave compuesta voluntarioId+coloniaId', async () => {
    const res = await graphql(CREATE_ASIGNACION, {
      data: { voluntarioId, coloniaId, rolAsignado: 'SUPERVISOR' },
    })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.errors).toBeUndefined();

    const enBaseDeDatos = await prisma.asignacionVoluntario.findUnique({
      where: { voluntarioId_coloniaId: { voluntarioId, coloniaId } },
    });
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

  it('la query por ambos ids devuelve la asignación', async () => {
    const res = await graphql(ASIGNACION_QUERY, { voluntarioId, coloniaId })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body.data.asignacion.rolAsignado).toBe('SUPERVISOR');
  });

  it('updateAsignacion cambia el rol sin cambiar la identidad del par', async () => {
    const res = await graphql(UPDATE_ASIGNACION, {
      voluntarioId,
      coloniaId,
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

    const enBaseDeDatos = await prisma.asignacionVoluntario.findUnique({
      where: { voluntarioId_coloniaId: { voluntarioId, coloniaId } },
    });
    expect(enBaseDeDatos).toBeNull();
  });
});
