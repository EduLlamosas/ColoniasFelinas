import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { runAsSuperadmin } from '../src/prisma/tenant-context.js';
import { bootstrapApp } from './utils/bootstrap-app.js';
import { crearGestorDePrueba } from './utils/auth-fixtures.js';
import { cleanDatabase } from './utils/clean-database.js';

const REGISTRAR_VISITA = `
  mutation RegistrarVisitaComedero($data: CreateVisitaComederoInput!) {
    registrarVisitaComedero(data: $data) {
      id comederoId piensoSeco comidaHumeda agua observaciones
      usuarioId
      usuario { id nombreCompleto }
    }
  }
`;

const VISITAS_COMEDERO_QUERY = `
  query VisitasComedero($comederoId: Int!) {
    visitasComedero(comederoId: $comederoId) { id piensoSeco }
  }
`;

const COMEDERO_QUERY = `
  query Comedero($id: ID!) {
    comedero(id: $id) { id ultimaVisita }
  }
`;

describe('VisitasComedero (integración real, e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let token: string;
  let usuarioId: number;
  let organizacionId: number;
  let comederoId: number;

  beforeAll(async () => {
    ({ app, prisma } = await bootstrapApp());
    await cleanDatabase(prisma);
    const registro = await crearGestorDePrueba(app, prisma);
    token = registro.token;
    usuarioId = Number(registro.usuario.id);
    organizacionId = registro.organizacionId;

    const comedero = await runAsSuperadmin(async () => {
      const colonia = await prisma.colonia.create({
        data: {
          organizacionId,
          codigoOficial: 'E2E-VISITA-COL',
          nombre: 'Colonia para visitas',
          tipoSuelo: 'URBANO',
          latitud: 1,
          longitud: 1,
        },
      });
      return prisma.comedero.create({
        data: { organizacionId, coloniaId: colonia.id, ubicacionDetallada: 'Junto al banco' },
      });
    });
    comederoId = comedero.id;
  });

  afterAll(async () => {
    await cleanDatabase(prisma);
    await app.close();
  });

  const graphql = (query: string, variables?: Record<string, unknown>) =>
    request(app.getHttpServer()).post('/graphql').send({ query, variables });

  it('comedero.ultimaVisita es null sin visitas registradas', async () => {
    const res = await graphql(COMEDERO_QUERY, { id: comederoId })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body.data.comedero.ultimaVisita).toBeNull();
  });

  it('registrarVisitaComedero persiste la traza con los insumos marcados', async () => {
    const res = await graphql(REGISTRAR_VISITA, {
      data: { comederoId, piensoSeco: true, agua: true, observaciones: 'Comedero sucio' },
    })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.errors).toBeUndefined();
    expect(res.body.data.registrarVisitaComedero.piensoSeco).toBe(true);
    expect(res.body.data.registrarVisitaComedero.comidaHumeda).toBe(false);

    // El autor sale del JWT de quien hace la petición, no de `data` (que no lo incluye).
    expect(res.body.data.registrarVisitaComedero.usuarioId).toBe(usuarioId);
    expect(res.body.data.registrarVisitaComedero.usuario.id).toBe(String(usuarioId));

    const enBaseDeDatos = await runAsSuperadmin(() =>
      prisma.visitaComedero.findUnique({
        where: { id: Number(res.body.data.registrarVisitaComedero.id) },
      }),
    );
    expect(enBaseDeDatos?.observaciones).toBe('Comedero sucio');
    expect(enBaseDeDatos?.usuarioId).toBe(usuarioId);
  });

  it('visitasComedero devuelve la traza registrada', async () => {
    const res = await graphql(VISITAS_COMEDERO_QUERY, { comederoId })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body.data.visitasComedero).toHaveLength(1);
  });

  it('comedero.ultimaVisita refleja la fecha de la traza ya registrada', async () => {
    const res = await graphql(COMEDERO_QUERY, { id: comederoId })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body.data.comedero.ultimaVisita).not.toBeNull();
  });

  it('dos registros con la misma idempotencyKey crean una sola visita (reintento de la cola offline del móvil)', async () => {
    // Comedero propio, no el `comederoId` compartido del resto del fichero: así no interfiere
    // con el conteo de "visitasComedero devuelve la traza registrada" de arriba.
    const comederoIdempotencia = await runAsSuperadmin(async () => {
      const coloniaIdempotencia = await prisma.colonia.create({
        data: {
          organizacionId,
          codigoOficial: 'E2E-VISITA-IDEMPOTENCIA',
          nombre: 'Colonia para idempotencia',
          tipoSuelo: 'RURAL',
          latitud: 1,
          longitud: 1,
        },
      });
      return prisma.comedero.create({
        data: { organizacionId, coloniaId: coloniaIdempotencia.id, ubicacionDetallada: 'Comedero idempotencia' },
      });
    });

    const variables = {
      data: {
        comederoId: comederoIdempotencia.id,
        agua: true,
        idempotencyKey: 'e2e-idempotencia-visita-1',
      },
    };

    const primera = await graphql(REGISTRAR_VISITA, variables).set('Authorization', `Bearer ${token}`).expect(200);
    expect(primera.body.errors).toBeUndefined();

    // Simula el reintento automático de la cola offline: MISMA clave, misma petición.
    const segunda = await graphql(REGISTRAR_VISITA, variables).set('Authorization', `Bearer ${token}`).expect(200);
    expect(segunda.body.errors).toBeUndefined();
    expect(segunda.body.data.registrarVisitaComedero.id).toBe(primera.body.data.registrarVisitaComedero.id);

    const visitas = await runAsSuperadmin(() =>
      prisma.visitaComedero.findMany({ where: { comederoId: comederoIdempotencia.id } }),
    );
    expect(visitas).toHaveLength(1);
  });

  it('ON DELETE CASCADE: borrar el comedero borra también sus visitas', async () => {
    await runAsSuperadmin(() => prisma.comedero.delete({ where: { id: comederoId } }));
    expect(
      await runAsSuperadmin(() => prisma.visitaComedero.findMany({ where: { comederoId } })),
    ).toHaveLength(0);
  });
});
