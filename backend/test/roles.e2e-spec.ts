import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { bootstrapApp } from './utils/bootstrap-app.js';
import { registerUserOrThrow } from './utils/register-user.js';
import { registerAdminOrThrow } from './utils/register-admin.js';
import { cleanDatabase } from './utils/clean-database.js';

// Alta/edición/borrado de datos maestros (Colonia, Comedero, Gato, Voluntario, Asignacion)
// reservado a ADMINISTRADOR; GESTOR se queda en solo lectura para esas 5 entidades pero
// conserva permiso de escritura en las 2 mutaciones de trabajo de campo (registrar visita a
// comedero / intervención médica), que no son edición del censo sino registro de actividad.
describe('Restricción de roles en mutaciones (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let gestorToken: string;
  let adminToken: string;
  let coloniaId: number;
  let comederoId: number;
  let gatoId: number;
  let voluntarioId: number;

  beforeAll(async () => {
    ({ app, prisma } = await bootstrapApp());
    await cleanDatabase(prisma);

    ({ token: gestorToken } = await registerUserOrThrow(app, { email: 'roles-gestor@test.local' }));
    ({ token: adminToken } = await registerAdminOrThrow(app, prisma, { email: 'roles-admin@test.local' }));

    const colonia = await prisma.colonia.create({
      data: {
        codigoOficial: 'E2E-ROLES-COL',
        nombre: 'Colonia para roles',
        tipoSuelo: 'URBANO',
        latitud: 1,
        longitud: 1,
      },
    });
    coloniaId = colonia.id;

    const comedero = await prisma.comedero.create({
      data: { coloniaId, ubicacionDetallada: 'Junto al banco' },
    });
    comederoId = comedero.id;

    const gato = await prisma.gato.create({
      data: { coloniaId, sexo: 'MACHO', capaPelaje: 'Atigrado', estadoCer: 'AVISTADO' },
    });
    gatoId = gato.id;

    const voluntario = await prisma.voluntario.create({
      data: {
        dni: '11111111H',
        nombre: 'Voluntario Roles E2E',
        urlCesionDatos: 'https://example.com/cesiones/roles-e2e.pdf',
      },
    });
    voluntarioId = voluntario.id;
  });

  afterAll(async () => {
    await cleanDatabase(prisma);
    await app.close();
  });

  const graphql = (query: string, variables: Record<string, unknown>, token: string) =>
    request(app.getHttpServer()).post('/graphql').send({ query, variables }).set('Authorization', `Bearer ${token}`);

  // buildVariables se evalúa dentro de cada it(), no al construir el array: coloniaId/comederoId/
  // etc. solo existen desde que termina el beforeAll, y el array en sí se construye en cuanto
  // Vitest recolecta el describe, antes de que el beforeAll llegue a ejecutarse. Ninguna de estas
  // mutaciones llega a ejecutarse de verdad para un GESTOR (el guard corta antes), así que
  // reutilizar los mismos IDs de fixtures en las 15 no borra ni modifica nada.
  const mutacionesDeDatosMaestros: Array<{
    nombre: string;
    query: string;
    buildVariables: () => Record<string, unknown>;
  }> = [
    {
      nombre: 'createColonia',
      query: `mutation($data: CreateColoniaInput!) { createColonia(data: $data) { id } }`,
      buildVariables: () => ({
        data: { codigoOficial: 'X', nombre: 'X', tipoSuelo: 'URBANO', latitud: 1, longitud: 1 },
      }),
    },
    {
      nombre: 'updateColonia',
      query: `mutation($id: ID!, $data: UpdateColoniaInput!) { updateColonia(id: $id, data: $data) { id } }`,
      buildVariables: () => ({ id: coloniaId, data: { nombre: 'X' } }),
    },
    {
      nombre: 'removeColonia',
      query: `mutation($id: ID!) { removeColonia(id: $id) }`,
      buildVariables: () => ({ id: coloniaId }),
    },
    {
      nombre: 'createComedero',
      query: `mutation($data: CreateComederoInput!) { createComedero(data: $data) { id } }`,
      buildVariables: () => ({ data: { coloniaId, ubicacionDetallada: 'X' } }),
    },
    {
      nombre: 'updateComedero',
      query: `mutation($id: ID!, $data: UpdateComederoInput!) { updateComedero(id: $id, data: $data) { id } }`,
      buildVariables: () => ({ id: comederoId, data: { ubicacionDetallada: 'X' } }),
    },
    {
      nombre: 'removeComedero',
      query: `mutation($id: ID!) { removeComedero(id: $id) }`,
      buildVariables: () => ({ id: comederoId }),
    },
    {
      nombre: 'createGato',
      query: `mutation($data: CreateGatoInput!) { createGato(data: $data) { id } }`,
      buildVariables: () => ({ data: { coloniaId, sexo: 'MACHO', capaPelaje: 'X', estadoCer: 'AVISTADO' } }),
    },
    {
      nombre: 'updateGato',
      query: `mutation($id: ID!, $data: UpdateGatoInput!) { updateGato(id: $id, data: $data) { id } }`,
      buildVariables: () => ({ id: gatoId, data: { estadoCer: 'ADOPTADO' } }),
    },
    {
      nombre: 'removeGato',
      query: `mutation($id: ID!) { removeGato(id: $id) }`,
      buildVariables: () => ({ id: gatoId }),
    },
    {
      nombre: 'createVoluntario',
      query: `mutation($data: CreateVoluntarioInput!) { createVoluntario(data: $data) { id } }`,
      buildVariables: () => ({
        data: { dni: '99999999R', nombre: 'X', urlCesionDatos: 'https://example.com/x.pdf' },
      }),
    },
    {
      nombre: 'updateVoluntario',
      query: `mutation($id: ID!, $data: UpdateVoluntarioInput!) { updateVoluntario(id: $id, data: $data) { id } }`,
      buildVariables: () => ({ id: voluntarioId, data: { telefono: 'X' } }),
    },
    {
      nombre: 'removeVoluntario',
      query: `mutation($id: ID!) { removeVoluntario(id: $id) }`,
      buildVariables: () => ({ id: voluntarioId }),
    },
    {
      nombre: 'createAsignacion',
      query: `mutation($data: CreateAsignacionInput!) { createAsignacion(data: $data) { voluntarioId } }`,
      buildVariables: () => ({ data: { voluntarioId, coloniaId, rolAsignado: 'X' } }),
    },
    {
      nombre: 'updateAsignacion',
      query: `mutation($voluntarioId: Int!, $coloniaId: Int!, $data: UpdateAsignacionInput!) { updateAsignacion(voluntarioId: $voluntarioId, coloniaId: $coloniaId, data: $data) { voluntarioId } }`,
      buildVariables: () => ({ voluntarioId, coloniaId, data: { rolAsignado: 'Y' } }),
    },
    {
      nombre: 'removeAsignacion',
      query: `mutation($voluntarioId: Int!, $coloniaId: Int!) { removeAsignacion(voluntarioId: $voluntarioId, coloniaId: $coloniaId) }`,
      buildVariables: () => ({ voluntarioId, coloniaId }),
    },
  ];

  it.each(mutacionesDeDatosMaestros)(
    'GESTOR recibe FORBIDDEN en $nombre (dato maestro reservado a ADMINISTRADOR)',
    async ({ query, buildVariables }) => {
      const res = await graphql(query, buildVariables(), gestorToken).expect(200);
      expect(res.body.errors?.[0]?.extensions?.code).toBe('FORBIDDEN');
    },
  );

  it('ADMINISTRADOR sí puede ejecutar las mutaciones de datos maestros (createColonia)', async () => {
    const res = await graphql(
      `mutation($data: CreateColoniaInput!) { createColonia(data: $data) { id codigoOficial } }`,
      { data: { codigoOficial: 'E2E-ROLES-ADMIN-OK', nombre: 'X', tipoSuelo: 'URBANO', latitud: 1, longitud: 1 } },
      adminToken,
    ).expect(200);

    expect(res.body.errors).toBeUndefined();
    expect(res.body.data.createColonia.codigoOficial).toBe('E2E-ROLES-ADMIN-OK');
  });

  it('GESTOR conserva permiso para registrar una visita a comedero (trabajo de campo, no dato maestro)', async () => {
    const res = await graphql(
      `mutation($data: CreateVisitaComederoInput!) { registrarVisitaComedero(data: $data) { id } }`,
      { data: { comederoId, agua: true } },
      gestorToken,
    ).expect(200);

    expect(res.body.errors).toBeUndefined();
  });

  it('GESTOR conserva permiso para registrar una intervención médica (trabajo de campo, no dato maestro)', async () => {
    const res = await graphql(
      `mutation($data: CreateRegistroClinicoInput!) {
        registrarIntervencionMedica(data: $data) { id }
      }`,
      {
        data: {
          gatoId,
          tipo: 'VACUNACION',
          fecha: '2026-01-15',
          diagnostico: 'Revisión rutinaria',
          nuevoEstadoCer: 'AVISTADO',
        },
      },
      gestorToken,
    ).expect(200);

    expect(res.body.errors).toBeUndefined();
  });
});
