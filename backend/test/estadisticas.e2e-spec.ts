import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { runAsSuperadmin } from '../src/prisma/tenant-context.js';
import { bootstrapApp } from './utils/bootstrap-app.js';
import { crearGestorDePrueba } from './utils/auth-fixtures.js';
import { cleanDatabase } from './utils/clean-database.js';

const ESTADISTICAS_QUERY = `
  query Estadisticas($diasSinVisita: Int) {
    estadisticas(diasSinVisita: $diasSinVisita) {
      gatosPorEstadoCer { estadoCer cantidad }
      comederosSinVisitaReciente { id ubicacionDetallada ultimaVisita }
      esterilizacionesTrimestreActual
    }
  }
`;

describe('Estadisticas (integración real, e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let token: string;
  let organizacionId: number;

  beforeAll(async () => {
    ({ app, prisma } = await bootstrapApp());
    await cleanDatabase(prisma);
    ({ token, organizacionId } = await crearGestorDePrueba(app, prisma));
  });

  afterAll(async () => {
    await cleanDatabase(prisma);
    await app.close();
  });

  const graphql = (query: string, variables?: Record<string, unknown>) =>
    request(app.getHttpServer()).post('/graphql').send({ query, variables });

  it('rechaza la query sin token', async () => {
    const res = await graphql(ESTADISTICAS_QUERY);
    expect(res.body.errors?.[0]?.extensions?.code).toBe('UNAUTHENTICATED');
  });

  it('agrega gatos por estado CER, comederos sin visita reciente y esterilizaciones del trimestre, todo con datos reales', async () => {
    const { comederoAntiguo } = await runAsSuperadmin(async () => {
      const colonia = await prisma.colonia.create({
        data: {
          organizacionId,
          codigoOficial: 'E2E-ESTADISTICAS-COL',
          nombre: 'Colonia para estadísticas',
          tipoSuelo: 'URBANO',
          latitud: 1,
          longitud: 1,
        },
      });

      // Dos gatos CAPTURADO, uno ESTERILIZADO.
      await prisma.gato.createMany({
        data: [
          { organizacionId, coloniaId: colonia.id, sexo: 'MACHO', capaPelaje: 'Negro', estadoCer: 'CAPTURADO' },
          { organizacionId, coloniaId: colonia.id, sexo: 'HEMBRA', capaPelaje: 'Blanco', estadoCer: 'CAPTURADO' },
          { organizacionId, coloniaId: colonia.id, sexo: 'MACHO', capaPelaje: 'Gris', estadoCer: 'ESTERILIZADO' },
        ],
      });

      // Un comedero con visita de hace 1 día (dentro del umbral) y otro con visita de hace 10 días
      // (fuera del umbral de 7) - solo el segundo debe salir en comederosSinVisitaReciente.
      const comederoReciente = await prisma.comedero.create({
        data: { organizacionId, coloniaId: colonia.id, ubicacionDetallada: 'Comedero con visita reciente' },
      });
      const comederoAntiguo = await prisma.comedero.create({
        data: { organizacionId, coloniaId: colonia.id, ubicacionDetallada: 'Comedero con visita antigua' },
      });
      await prisma.visitaComedero.create({
        data: {
          organizacionId,
          comederoId: comederoReciente.id,
          agua: true,
          createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        },
      });
      await prisma.visitaComedero.create({
        data: {
          organizacionId,
          comederoId: comederoAntiguo.id,
          agua: true,
          createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        },
      });

      // Una esterilización real hoy (dentro del trimestre actual) para poder comprobar el conteo.
      const gatoParaIntervencion = await prisma.gato.create({
        data: { organizacionId, coloniaId: colonia.id, sexo: 'MACHO', capaPelaje: 'Atigrado', estadoCer: 'CAPTURADO' },
      });
      await prisma.registroClinico.create({
        data: {
          organizacionId,
          gatoId: gatoParaIntervencion.id,
          tipo: 'ESTERILIZACION',
          fecha: new Date(),
          diagnostico: 'Intervención de prueba',
        },
      });
      // Y una vacunación real, que NO debe contar como esterilización.
      await prisma.registroClinico.create({
        data: {
          organizacionId,
          gatoId: gatoParaIntervencion.id,
          tipo: 'VACUNACION',
          fecha: new Date(),
          diagnostico: 'Vacuna de prueba',
        },
      });

      return { colonia, comederoAntiguo };
    });

    const res = await graphql(ESTADISTICAS_QUERY, { diasSinVisita: 7 })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.errors).toBeUndefined();
    const { gatosPorEstadoCer, comederosSinVisitaReciente, esterilizacionesTrimestreActual } =
      res.body.data.estadisticas;

    // Base de datos recién limpiada en beforeAll y este es el único test que crea gatos/visitas/
    // registros: se puede comprobar el total exacto, no solo "al menos los que yo esperaba".
    const porEstado = Object.fromEntries(gatosPorEstadoCer.map((g: any) => [g.estadoCer, g.cantidad]));
    expect(porEstado.CAPTURADO).toBe(3); // 2 iniciales + el usado para la intervención
    expect(porEstado.ESTERILIZADO).toBe(1);

    expect(comederosSinVisitaReciente).toHaveLength(1);
    expect(comederosSinVisitaReciente[0].id).toBe(String(comederoAntiguo.id));

    expect(esterilizacionesTrimestreActual).toBe(1); // la vacunación no debe contar
  });
});
