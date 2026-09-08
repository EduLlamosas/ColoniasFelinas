import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { bootstrapApp } from './utils/bootstrap-app.js';
import { registerUserOrThrow } from './utils/register-user.js';
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
  let comederoId: number;

  beforeAll(async () => {
    ({ app, prisma } = await bootstrapApp());
    await cleanDatabase(prisma);
    const registro = await registerUserOrThrow(app);
    token = registro.token;
    usuarioId = Number(registro.usuario.id);

    const colonia = await prisma.colonia.create({
      data: {
        codigoOficial: 'E2E-VISITA-COL',
        nombre: 'Colonia para visitas',
        tipoSuelo: 'URBANO',
        latitud: 1,
        longitud: 1,
      },
    });
    const comedero = await prisma.comedero.create({
      data: { coloniaId: colonia.id, ubicacionDetallada: 'Junto al banco' },
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

    const enBaseDeDatos = await prisma.visitaComedero.findUnique({
      where: { id: Number(res.body.data.registrarVisitaComedero.id) },
    });
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

  it('ON DELETE CASCADE: borrar el comedero borra también sus visitas', async () => {
    await prisma.comedero.delete({ where: { id: comederoId } });
    expect(await prisma.visitaComedero.findMany({ where: { comederoId } })).toHaveLength(0);
  });
});
