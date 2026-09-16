import { EstadisticasService } from './estadisticas.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';

function createPrismaMock() {
  return {
    gato: { groupBy: vi.fn() },
    comedero: { findMany: vi.fn() },
    visitaComedero: { groupBy: vi.fn() },
    registroClinico: { count: vi.fn() },
  };
}

describe('EstadisticasService', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let service: EstadisticasService;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new EstadisticasService(prisma as unknown as PrismaService);
  });

  describe('gatosPorEstadoCer', () => {
    it('traduce el groupBy de Prisma a { estadoCer, cantidad }', async () => {
      prisma.gato.groupBy.mockResolvedValue([
        { estadoCer: 'CAPTURADO', _count: { _all: 3 } },
        { estadoCer: 'ESTERILIZADO', _count: { _all: 5 } },
      ]);

      const resultado = await service.gatosPorEstadoCer();

      expect(prisma.gato.groupBy).toHaveBeenCalledWith({ by: ['estadoCer'], _count: { _all: true } });
      expect(resultado).toEqual([
        { estadoCer: 'CAPTURADO', cantidad: 3 },
        { estadoCer: 'ESTERILIZADO', cantidad: 5 },
      ]);
    });
  });

  describe('comederosSinVisitaReciente', () => {
    it('excluye un comedero con visita dentro del umbral e incluye uno con visita antigua y uno sin ninguna', async () => {
      const hace1Dia = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000);
      const hace10Dias = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);

      prisma.comedero.findMany.mockResolvedValue([
        { id: 1, coloniaId: 1, ubicacionDetallada: 'Reciente' },
        { id: 2, coloniaId: 1, ubicacionDetallada: 'Antigua' },
        { id: 3, coloniaId: 1, ubicacionDetallada: 'Nunca visitado' },
      ]);
      prisma.visitaComedero.groupBy.mockResolvedValue([
        { comederoId: 1, _max: { createdAt: hace1Dia } },
        { comederoId: 2, _max: { createdAt: hace10Dias } },
        // comederoId 3 no aparece: nunca tuvo ninguna visita.
      ]);

      const resultado = await service.comederosSinVisitaReciente(7);

      expect(resultado.map((c) => c.id)).toEqual([2, 3]);
      expect(resultado.find((c) => c.id === 2)?.ultimaVisita).toEqual(hace10Dias);
      expect(resultado.find((c) => c.id === 3)?.ultimaVisita).toBeNull();
    });
  });

  describe('esterilizacionesTrimestreActual', () => {
    it('cuenta solo intervenciones de tipo ESTERILIZACION dentro del trimestre en curso', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-05-15T12:00:00.000Z')); // dentro del Q2 (abr-jun)
      prisma.registroClinico.count.mockResolvedValue(4);

      const resultado = await service.esterilizacionesTrimestreActual();

      expect(resultado).toBe(4);
      expect(prisma.registroClinico.count).toHaveBeenCalledWith({
        where: {
          tipo: 'ESTERILIZACION',
          fecha: { gte: new Date(2026, 3, 1), lt: new Date(2026, 6, 1) },
        },
      });
      vi.useRealTimers();
    });
  });

  describe('obtenerTodas', () => {
    it('combina las tres consultas en un único objeto', async () => {
      prisma.gato.groupBy.mockResolvedValue([]);
      prisma.comedero.findMany.mockResolvedValue([]);
      prisma.visitaComedero.groupBy.mockResolvedValue([]);
      prisma.registroClinico.count.mockResolvedValue(2);

      const resultado = await service.obtenerTodas(7);

      expect(resultado).toEqual({
        gatosPorEstadoCer: [],
        comederosSinVisitaReciente: [],
        esterilizacionesTrimestreActual: 2,
      });
    });
  });
});
