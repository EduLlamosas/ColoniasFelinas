import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { bootstrapApp } from './utils/bootstrap-app.js';
import { registerUserOrThrow } from './utils/register-user.js';
import { cleanDatabase } from './utils/clean-database.js';

const CREATE_COLONIA = `
  mutation CreateColonia($data: CreateColoniaInput!) {
    createColonia(data: $data) { id codigoOficial nombre tipoSuelo }
  }
`;

const COLONIAS_QUERY = `{ colonias { id nombre } }`;

const UPDATE_COLONIA = `
  mutation UpdateColonia($id: ID!, $data: UpdateColoniaInput!) {
    updateColonia(id: $id, data: $data) { id nombre }
  }
`;

const REMOVE_COLONIA = `
  mutation RemoveColonia($id: ID!) {
    removeColonia(id: $id)
  }
`;

const CREATE_GATO = `
  mutation CreateGato($data: CreateGatoInput!) {
    createGato(data: $data) { id }
  }
`;

const REMOVE_GATO = `
  mutation RemoveGato($id: ID!) {
    removeGato(id: $id)
  }
`;

describe('Colonias (integración real, e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let token: string;
  let coloniaId: string;

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

  it('rechaza una query sin token de verdad (no mockeado)', async () => {
    const res = await graphql(COLONIAS_QUERY);
    // GraphQL/Apollo devuelve SIEMPRE HTTP 200, incluso en error: el fallo
    // real va dentro de body.errors[].extensions, no en el status code.
    expect(res.status).toBe(200);
    expect(res.body.errors?.[0]?.extensions?.code).toBe('UNAUTHENTICATED');
  });

  it('createColonia persiste de verdad en Postgres', async () => {
    const res = await graphql(CREATE_COLONIA, {
      data: {
        codigoOficial: 'E2E-COL-1',
        nombre: 'Colonia E2E',
        tipoSuelo: 'URBANO',
        latitud: 40.1,
        longitud: -3.1,
      },
    })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.errors).toBeUndefined();
    coloniaId = res.body.data.createColonia.id;

    // Verificación directa contra la base de datos, sin pasar por GraphQL:
    const enBaseDeDatos = await prisma.colonia.findUnique({ where: { id: Number(coloniaId) } });
    expect(enBaseDeDatos?.codigoOficial).toBe('E2E-COL-1');
  });

  it('la query de colonias, ya autenticada, devuelve la creada', async () => {
    const res = await graphql(COLONIAS_QUERY).set('Authorization', `Bearer ${token}`).expect(200);
    expect(res.body.data.colonias).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: coloniaId })]),
    );
  });

  it('updateColonia persiste el cambio', async () => {
    const res = await graphql(UPDATE_COLONIA, { id: coloniaId, data: { nombre: 'Renombrada' } })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.data.updateColonia.nombre).toBe('Renombrada');
    const enBaseDeDatos = await prisma.colonia.findUnique({ where: { id: Number(coloniaId) } });
    expect(enBaseDeDatos?.nombre).toBe('Renombrada');
  });

  it('ON DELETE RESTRICT bloquea de verdad borrar una colonia con un gato censado', async () => {
    const gato = await graphql(CREATE_GATO, {
      data: { coloniaId: Number(coloniaId), sexo: 'MACHO', capaPelaje: 'Atigrado', estadoCer: 'AVISTADO' },
    })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    const gatoId = gato.body.data.createGato.id;

    const intentoBorrado = await graphql(REMOVE_COLONIA, { id: coloniaId })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(intentoBorrado.body.errors).toBeDefined();
    // La colonia sigue existiendo de verdad en Postgres:
    expect(await prisma.colonia.findUnique({ where: { id: Number(coloniaId) } })).not.toBeNull();

    // Quitamos el gato y ahora sí debe dejar borrar la colonia:
    await graphql(REMOVE_GATO, { id: gatoId }).set('Authorization', `Bearer ${token}`).expect(200);
    const borradoFinal = await graphql(REMOVE_COLONIA, { id: coloniaId })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(borradoFinal.body.errors).toBeUndefined();
    expect(await prisma.colonia.findUnique({ where: { id: Number(coloniaId) } })).toBeNull();
  });
});
