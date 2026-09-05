import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { bootstrapApp } from './utils/bootstrap-app.js';
import { registerUserOrThrow } from './utils/register-user.js';
import { cleanDatabase } from './utils/clean-database.js';

const CREATE_VOLUNTARIO = `
  mutation CreateVoluntario($data: CreateVoluntarioInput!) {
    createVoluntario(data: $data) { id dni nombre }
  }
`;

const UPDATE_VOLUNTARIO = `
  mutation UpdateVoluntario($id: ID!, $data: UpdateVoluntarioInput!) {
    updateVoluntario(id: $id, data: $data) { id telefono }
  }
`;

const REMOVE_VOLUNTARIO = `
  mutation RemoveVoluntario($id: ID!) {
    removeVoluntario(id: $id)
  }
`;

describe('Voluntarios (integración real, e2e)', () => {
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

  it('rechaza un DNI con formato inválido, validado de verdad por el ValidationPipe', async () => {
    const res = await graphql(CREATE_VOLUNTARIO, {
      data: {
        dni: 'no-es-un-dni',
        nombre: 'Ana',
        urlCesionDatos: 'https://example.com/cesiones/ana.pdf',
      },
    })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.errors?.[0]?.extensions?.code).toBe('BAD_REQUEST');
    expect(res.body.data).toBeNull();
  });

  let voluntarioId: string;

  it('createVoluntario con un DNI válido persiste de verdad', async () => {
    const res = await graphql(CREATE_VOLUNTARIO, {
      data: {
        dni: '12345678Z',
        nombre: 'Ana Pérez',
        urlCesionDatos: 'https://example.com/cesiones/ana-perez.pdf',
      },
    })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.errors).toBeUndefined();
    voluntarioId = res.body.data.createVoluntario.id;
    expect(await prisma.voluntario.findUnique({ where: { id: Number(voluntarioId) } })).not.toBeNull();
  });

  it('un DNI duplicado lo rechaza como conflicto real (P2002)', async () => {
    const res = await graphql(CREATE_VOLUNTARIO, {
      data: {
        dni: '12345678Z',
        nombre: 'Otro Nombre',
        urlCesionDatos: 'https://example.com/cesiones/otro-nombre.pdf',
      },
    })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.errors?.[0]?.extensions?.code).toBe('CONFLICT');
  });

  it('updateVoluntario persiste el cambio', async () => {
    const res = await graphql(UPDATE_VOLUNTARIO, {
      id: voluntarioId,
      data: { telefono: '600111222' },
    })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.data.updateVoluntario.telefono).toBe('600111222');
  });

  it('removeVoluntario lo borra de verdad', async () => {
    await graphql(REMOVE_VOLUNTARIO, { id: voluntarioId })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(await prisma.voluntario.findUnique({ where: { id: Number(voluntarioId) } })).toBeNull();
  });
});
