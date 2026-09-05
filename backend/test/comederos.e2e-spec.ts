import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { bootstrapApp } from './utils/bootstrap-app.js';
import { registerUserOrThrow } from './utils/register-user.js';
import { cleanDatabase } from './utils/clean-database.js';

const CREATE_COMEDERO = `
  mutation CreateComedero($data: CreateComederoInput!) {
    createComedero(data: $data) { id coloniaId ubicacionDetallada }
  }
`;

const COMEDEROS_QUERY = `{ comederos { id ubicacionDetallada } }`;

const UPDATE_COMEDERO = `
  mutation UpdateComedero($id: ID!, $data: UpdateComederoInput!) {
    updateComedero(id: $id, data: $data) { id ubicacionDetallada }
  }
`;

const REMOVE_COLONIA = `
  mutation RemoveColonia($id: ID!) {
    removeColonia(id: $id)
  }
`;

describe('Comederos (integración real, e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let token: string;
  let coloniaId: number;

  beforeAll(async () => {
    ({ app, prisma } = await bootstrapApp());
    await cleanDatabase(prisma);
    ({ token } = await registerUserOrThrow(app));

    const colonia = await prisma.colonia.create({
      data: {
        codigoOficial: 'E2E-COM-COL',
        nombre: 'Colonia para comederos',
        tipoSuelo: 'RURAL',
        latitud: 1,
        longitud: 1,
      },
    });
    coloniaId = colonia.id;
  });

  afterAll(async () => {
    await cleanDatabase(prisma);
    await app.close();
  });

  const graphql = (query: string, variables?: Record<string, unknown>) =>
    request(app.getHttpServer()).post('/graphql').send({ query, variables });

  it('rechaza la creación sin token', async () => {
    const res = await graphql(CREATE_COMEDERO, {
      data: { coloniaId, ubicacionDetallada: 'x' },
    });
    expect(res.body.errors?.[0]?.extensions?.code).toBe('UNAUTHENTICATED');
  });

  it('rechaza un coloniaId que no existe, con el error traducido por handlePrismaError', async () => {
    const res = await graphql(CREATE_COMEDERO, {
      data: { coloniaId: 999999, ubicacionDetallada: 'x' },
    })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.errors?.[0]?.extensions?.code).toBe('BAD_REQUEST');
  });

  let comederoId: string;

  it('createComedero persiste de verdad, ligado a la colonia', async () => {
    const res = await graphql(CREATE_COMEDERO, {
      data: { coloniaId, ubicacionDetallada: 'Junto al banco' },
    })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    comederoId = res.body.data.createComedero.id;
    const enBaseDeDatos = await prisma.comedero.findUnique({ where: { id: Number(comederoId) } });
    expect(enBaseDeDatos?.coloniaId).toBe(coloniaId);
  });

  it('la query de comederos devuelve el creado', async () => {
    const res = await graphql(COMEDEROS_QUERY).set('Authorization', `Bearer ${token}`).expect(200);
    expect(res.body.data.comederos).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: comederoId })]),
    );
  });

  it('updateComedero persiste el cambio', async () => {
    const res = await graphql(UPDATE_COMEDERO, {
      id: comederoId,
      data: { ubicacionDetallada: 'Junto a la fuente' },
    })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.data.updateComedero.ubicacionDetallada).toBe('Junto a la fuente');
  });

  it('ON DELETE CASCADE: borrar la colonia borra también sus comederos', async () => {
    await graphql(REMOVE_COLONIA, { id: coloniaId })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(await prisma.comedero.findUnique({ where: { id: Number(comederoId) } })).toBeNull();
  });
});
