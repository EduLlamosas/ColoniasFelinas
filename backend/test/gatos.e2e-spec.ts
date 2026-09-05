import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { bootstrapApp } from './utils/bootstrap-app.js';
import { registerUserOrThrow } from './utils/register-user.js';
import { cleanDatabase } from './utils/clean-database.js';

const CREATE_GATO = `
  mutation CreateGato($data: CreateGatoInput!) {
    createGato(data: $data) { id sexo estadoCer numMicrochip }
  }
`;

const UPDATE_GATO = `
  mutation UpdateGato($id: ID!, $data: UpdateGatoInput!) {
    updateGato(id: $id, data: $data) { id estadoCer }
  }
`;

const REMOVE_GATO = `
  mutation RemoveGato($id: ID!) {
    removeGato(id: $id)
  }
`;

describe('Gatos (integración real, e2e)', () => {
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
        codigoOficial: 'E2E-GATO-COL',
        nombre: 'Colonia para gatos',
        tipoSuelo: 'INDUSTRIAL',
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

  let gatoId: string;

  it('createGato persiste con sus enums (sexo, estadoCer) intactos', async () => {
    const res = await graphql(CREATE_GATO, {
      data: {
        coloniaId,
        sexo: 'HEMBRA',
        capaPelaje: 'Negro',
        estadoCer: 'ESTERILIZADO',
        numMicrochip: 'CHIP-001',
      },
    })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.errors).toBeUndefined();
    gatoId = res.body.data.createGato.id;
    expect(res.body.data.createGato.sexo).toBe('HEMBRA');
    expect(res.body.data.createGato.estadoCer).toBe('ESTERILIZADO');

    const enBaseDeDatos = await prisma.gato.findUnique({ where: { id: Number(gatoId) } });
    expect(enBaseDeDatos?.sexo).toBe('HEMBRA');
  });

  it('un numMicrochip duplicado lo rechaza handlePrismaError como conflicto real (P2002)', async () => {
    const res = await graphql(CREATE_GATO, {
      data: {
        coloniaId,
        sexo: 'MACHO',
        capaPelaje: 'Blanco',
        estadoCer: 'AVISTADO',
        numMicrochip: 'CHIP-001', // mismo chip que el gato anterior
      },
    })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.errors?.[0]?.extensions?.code).toBe('CONFLICT');
  });

  it('updateGato persiste el cambio de estado CER', async () => {
    const res = await graphql(UPDATE_GATO, { id: gatoId, data: { estadoCer: 'ADOPTADO' } })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.data.updateGato.estadoCer).toBe('ADOPTADO');
    const enBaseDeDatos = await prisma.gato.findUnique({ where: { id: Number(gatoId) } });
    expect(enBaseDeDatos?.estadoCer).toBe('ADOPTADO');
  });

  it('removeGato lo borra de verdad', async () => {
    await graphql(REMOVE_GATO, { id: gatoId }).set('Authorization', `Bearer ${token}`).expect(200);
    expect(await prisma.gato.findUnique({ where: { id: Number(gatoId) } })).toBeNull();
  });
});
