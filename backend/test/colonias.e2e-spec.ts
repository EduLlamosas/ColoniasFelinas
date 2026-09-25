import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { runAsSuperadmin } from '../src/prisma/tenant-context.js';
import { bootstrapApp } from './utils/bootstrap-app.js';
import { crearAdminDePrueba } from './utils/auth-fixtures.js';
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

const REGISTRAR_INTERVENCION = `
  mutation RegistrarIntervencionMedica($data: CreateRegistroClinicoInput!) {
    registrarIntervencionMedica(data: $data) { id }
  }
`;

const COLONIA_DETAIL_QUERY = `
  query ColoniaDetail($id: ID!) {
    colonia(id: $id) {
      gatos { id registrosClinicos { fecha diagnostico } }
    }
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
    ({ token } = await crearAdminDePrueba(app, prisma));
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

    // Verificación directa contra la base de datos, sin pasar por GraphQL (RLS exige un contexto
    // de tenant en cualquier lectura - runAsSuperadmin es el mismo bypass que usa seed.ts).
    const enBaseDeDatos = await runAsSuperadmin(() =>
      prisma.colonia.findUnique({ where: { id: Number(coloniaId) } }),
    );
    expect(enBaseDeDatos?.codigoOficial).toBe('E2E-COL-1');
  });

  // Lo asigna el ayuntamiento en un trámite administrativo aparte, que puede tardar más que el
  // propio censado sobre el terreno - exigirlo en el alta bloquearía registrar la colonia el
  // mismo día que se descubre.
  it('createColonia sin codigoOficial lo persiste como null (se asigna más adelante)', async () => {
    const res = await graphql(CREATE_COLONIA, {
      data: {
        nombre: 'Colonia E2E sin código',
        tipoSuelo: 'URBANO',
        latitud: 40.2,
        longitud: -3.2,
      },
    })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.errors).toBeUndefined();
    expect(res.body.data.createColonia.codigoOficial).toBeNull();

    const enBaseDeDatos = await runAsSuperadmin(() =>
      prisma.colonia.findUnique({ where: { id: Number(res.body.data.createColonia.id) } }),
    );
    expect(enBaseDeDatos?.codigoOficial).toBeNull();
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
    const enBaseDeDatos = await runAsSuperadmin(() =>
      prisma.colonia.findUnique({ where: { id: Number(coloniaId) } }),
    );
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
    expect(
      await runAsSuperadmin(() => prisma.colonia.findUnique({ where: { id: Number(coloniaId) } })),
    ).not.toBeNull();

    // Quitamos el gato y ahora sí debe dejar borrar la colonia:
    await graphql(REMOVE_GATO, { id: gatoId }).set('Authorization', `Bearer ${token}`).expect(200);
    const borradoFinal = await graphql(REMOVE_COLONIA, { id: coloniaId })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(borradoFinal.body.errors).toBeUndefined();
    expect(
      await runAsSuperadmin(() => prisma.colonia.findUnique({ where: { id: Number(coloniaId) } })),
    ).toBeNull();
  });

  // Contra Postgres de verdad, no mockeado: el recorte a "las 3 más recientes" de
  // registrosClinicosPorGato (ver dataloaders.ts) lo hace un ROW_NUMBER() OVER (PARTITION BY ...)
  // en SQL crudo - un test unitario con Prisma mockeado no puede detectar un error de sintaxis o
  // de semántica en esa ventana; hace falta ejecutarlo contra la base de datos real.
  it('colonia(id) { gatos { registrosClinicos } } devuelve solo los 3 más recientes de cada gato', async () => {
    const colonia = await graphql(CREATE_COLONIA, {
      data: {
        codigoOficial: 'E2E-COL-TOP3',
        nombre: 'Colonia para el recorte a 3',
        tipoSuelo: 'URBANO',
        latitud: 40.3,
        longitud: -3.3,
      },
    })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    const coloniaTop3Id = colonia.body.data.createColonia.id;

    const gato = await graphql(CREATE_GATO, {
      data: { coloniaId: Number(coloniaTop3Id), sexo: 'MACHO', capaPelaje: 'Atigrado', estadoCer: 'AVISTADO' },
    })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    const gatoTop3Id = gato.body.data.createGato.id;

    // 4 registros con fechas distintas, creados fuera de orden cronológico a propósito - si el
    // recorte se fiara del orden de inserción en vez de ORDER BY fecha DESC dentro de la ventana,
    // esto lo destaparía.
    const fechas = ['2026-02-01', '2026-04-01', '2026-01-01', '2026-03-01'];
    for (const fecha of fechas) {
      await graphql(REGISTRAR_INTERVENCION, {
        data: { gatoId: Number(gatoTop3Id), tipo: 'VACUNACION', fecha, diagnostico: `Registro ${fecha}`, nuevoEstadoCer: 'AVISTADO' },
      })
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    }

    const res = await graphql(COLONIA_DETAIL_QUERY, { id: coloniaTop3Id })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.errors).toBeUndefined();
    const registros = res.body.data.colonia.gatos[0].registrosClinicos;
    expect(registros).toHaveLength(3);
    // Los 3 más recientes, en orden descendente - el 2026-01-01 (el más antiguo) se queda fuera.
    expect(registros.map((r: { fecha: string }) => r.fecha)).toEqual([
      '2026-04-01T00:00:00.000Z',
      '2026-03-01T00:00:00.000Z',
      '2026-02-01T00:00:00.000Z',
    ]);
  });
});
