import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { bootstrapApp } from './utils/bootstrap-app.js';
import { registerUserOrThrow } from './utils/register-user.js';
import { cleanDatabase } from './utils/clean-database.js';

const REGISTRAR_INTERVENCION = `
  mutation RegistrarIntervencionMedica($data: CreateRegistroClinicoInput!) {
    registrarIntervencionMedica(data: $data) { id gatoId tipo diagnostico }
  }
`;

const REGISTROS_CLINICOS_QUERY = `
  query RegistrosClinicos($gatoId: Int!) {
    registrosClinicos(gatoId: $gatoId) { id tipo diagnostico }
  }
`;

describe('RegistrosClinicos (integración real, e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let token: string;
  let gatoId: number;

  beforeAll(async () => {
    ({ app, prisma } = await bootstrapApp());
    await cleanDatabase(prisma);
    ({ token } = await registerUserOrThrow(app));

    const colonia = await prisma.colonia.create({
      data: {
        codigoOficial: 'E2E-CLINICO-COL',
        nombre: 'Colonia para historial clínico',
        tipoSuelo: 'RURAL',
        latitud: 1,
        longitud: 1,
      },
    });
    const gato = await prisma.gato.create({
      data: {
        coloniaId: colonia.id,
        sexo: 'MACHO',
        capaPelaje: 'Atigrado',
        estadoCer: 'CAPTURADO',
      },
    });
    gatoId = gato.id;
  });

  afterAll(async () => {
    await cleanDatabase(prisma);
    await app.close();
  });

  const graphql = (query: string, variables?: Record<string, unknown>) =>
    request(app.getHttpServer()).post('/graphql').send({ query, variables });

  it('registrarIntervencionMedica crea el registro clínico y actualiza estado_cer en la misma transacción', async () => {
    const res = await graphql(REGISTRAR_INTERVENCION, {
      data: {
        gatoId,
        tipo: 'ESTERILIZACION',
        fecha: '2026-01-15',
        diagnostico: 'Intervención sin incidencias',
        nuevoEstadoCer: 'ESTERILIZADO',
      },
    })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.errors).toBeUndefined();
    expect(res.body.data.registrarIntervencionMedica.tipo).toBe('ESTERILIZACION');

    const gatoEnBaseDeDatos = await prisma.gato.findUnique({ where: { id: gatoId } });
    expect(gatoEnBaseDeDatos?.estadoCer).toBe('ESTERILIZADO');

    const registroEnBaseDeDatos = await prisma.registroClinico.findUnique({
      where: { id: Number(res.body.data.registrarIntervencionMedica.id) },
    });
    expect(registroEnBaseDeDatos?.diagnostico).toBe('Intervención sin incidencias');
  });

  it('registrosClinicos devuelve el historial del gato', async () => {
    const res = await graphql(REGISTROS_CLINICOS_QUERY, { gatoId })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body.data.registrosClinicos).toHaveLength(1);
  });

  it('un gatoId inexistente no deja ni registro clínico ni cambio de estado (transacción atómica)', async () => {
    const res = await graphql(REGISTRAR_INTERVENCION, {
      data: {
        gatoId: 999999,
        tipo: 'VACUNACION',
        fecha: '2026-01-15',
        diagnostico: 'No debería persistir',
        nuevoEstadoCer: 'ADOPTADO',
      },
    })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.errors).toBeDefined();
    const registros = await prisma.registroClinico.findMany({ where: { gatoId: 999999 } });
    expect(registros).toHaveLength(0);
  });

  it('ON DELETE CASCADE: borrar el gato borra también su historial clínico', async () => {
    await prisma.gato.delete({ where: { id: gatoId } });
    expect(await prisma.registroClinico.findMany({ where: { gatoId } })).toHaveLength(0);
  });
});
