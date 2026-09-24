import { createLoaders } from './dataloaders.js';
import type { PrismaService } from '../prisma/prisma.service.js';

function createPrismaMock() {
  return {
    gato: { findMany: vi.fn() },
    comedero: { findMany: vi.fn() },
    asignacionVoluntario: { findMany: vi.fn() },
    voluntario: { findMany: vi.fn() },
    usuario: { findMany: vi.fn() },
    visitaComedero: { groupBy: vi.fn() },
    // $queryRaw se invoca como plantilla etiquetada (prisma.$queryRaw`...`), que en JS no es más
    // que llamar a la función con (strings, ...valores) - un vi.fn() normal vale igual como doble.
    $queryRaw: vi.fn(),
  };
}

// Cada DataLoader agrupa TODAS las claves pedidas en la misma "vuelta" del bucle de eventos en
// una única llamada al batch function - por eso cada test pide varias claves con Promise.all en
// vez de una sola: es la única forma de comprobar de verdad que se hizo UNA consulta para el
// lote entero, no una por clave (que es justo el problema N+1 que este fichero existe para
// evitar).
describe('createLoaders', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let loaders: ReturnType<typeof createLoaders>;

  beforeEach(() => {
    prisma = createPrismaMock();
    loaders = createLoaders(prisma as unknown as PrismaService);
  });

  it('gatosPorColonia agrupa una sola consulta para varias colonias, en el orden pedido', async () => {
    prisma.gato.findMany.mockResolvedValue([
      { id: 1, coloniaId: 10, nombre: 'A' },
      { id: 2, coloniaId: 20, nombre: 'B' },
      { id: 3, coloniaId: 10, nombre: 'C' },
    ]);

    const [gatosColonia10, gatosColonia20, gatosColoniaSinGatos] = await Promise.all([
      loaders.gatosPorColonia.load(10),
      loaders.gatosPorColonia.load(20),
      loaders.gatosPorColonia.load(30),
    ]);

    expect(prisma.gato.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.gato.findMany).toHaveBeenCalledWith({ where: { coloniaId: { in: [10, 20, 30] } } });
    expect(gatosColonia10).toEqual([
      { id: 1, coloniaId: 10, nombre: 'A' },
      { id: 3, coloniaId: 10, nombre: 'C' },
    ]);
    expect(gatosColonia20).toEqual([{ id: 2, coloniaId: 20, nombre: 'B' }]);
    expect(gatosColoniaSinGatos).toEqual([]);
  });

  it('comederosPorColonia agrupa por coloniaId', async () => {
    prisma.comedero.findMany.mockResolvedValue([{ id: 1, coloniaId: 10 }]);
    const resultado = await loaders.comederosPorColonia.load(10);
    expect(prisma.comedero.findMany).toHaveBeenCalledWith({ where: { coloniaId: { in: [10] } } });
    expect(resultado).toEqual([{ id: 1, coloniaId: 10 }]);
  });

  it('asignacionesPorColonia agrupa por coloniaId', async () => {
    prisma.asignacionVoluntario.findMany.mockResolvedValue([{ voluntarioId: 1, coloniaId: 10 }]);
    const resultado = await loaders.asignacionesPorColonia.load(10);
    expect(prisma.asignacionVoluntario.findMany).toHaveBeenCalledWith({
      where: { coloniaId: { in: [10] } },
    });
    expect(resultado).toEqual([{ voluntarioId: 1, coloniaId: 10 }]);
  });

  it('voluntarioPorId devuelve null para un id que no existe, sin romper el resto del lote', async () => {
    prisma.voluntario.findMany.mockResolvedValue([{ id: 1, nombre: 'Ana' }]);
    const [voluntario1, voluntarioInexistente] = await Promise.all([
      loaders.voluntarioPorId.load(1),
      loaders.voluntarioPorId.load(99),
    ]);
    expect(prisma.voluntario.findMany).toHaveBeenCalledTimes(1);
    expect(voluntario1).toEqual({ id: 1, nombre: 'Ana' });
    expect(voluntarioInexistente).toBeNull();
  });

  it('usuarioPorId devuelve null para un id que no existe', async () => {
    prisma.usuario.findMany.mockResolvedValue([{ id: 7, nombreCompleto: 'Gestor' }]);
    const [usuario, inexistente] = await Promise.all([
      loaders.usuarioPorId.load(7),
      loaders.usuarioPorId.load(0),
    ]);
    expect(usuario).toEqual({ id: 7, nombreCompleto: 'Gestor' });
    expect(inexistente).toBeNull();
  });

  it('ultimaVisitaPorComedero usa groupBy con _max (no trae las filas enteras) y devuelve null sin visitas', async () => {
    prisma.visitaComedero.groupBy.mockResolvedValue([
      { comederoId: 1, _max: { createdAt: new Date('2026-01-15') } },
    ]);

    const [conVisita, sinVisita] = await Promise.all([
      loaders.ultimaVisitaPorComedero.load(1),
      loaders.ultimaVisitaPorComedero.load(2),
    ]);

    expect(prisma.visitaComedero.groupBy).toHaveBeenCalledWith({
      by: ['comederoId'],
      where: { comederoId: { in: [1, 2] } },
      _max: { createdAt: true },
    });
    expect(conVisita).toEqual(new Date('2026-01-15'));
    expect(sinVisita).toBeNull();
  });

  it('registrosClinicosPorGato agrupa por gatoId el resultado ya recortado a 3 que devuelve la consulta SQL', async () => {
    // El recorte "solo las 3 más recientes por gato" lo hace la propia consulta SQL cruda
    // (ROW_NUMBER() OVER (PARTITION BY gato_id ORDER BY fecha DESC), ver dataloaders.ts) - eso
    // solo se puede comprobar de verdad contra Postgres (ver colonias.e2e-spec.ts). Este test
    // unitario cubre lo que sí es responsabilidad del loader: agrupar por gatoId las filas que
    // $queryRaw ya devolvió (simulando aquí una respuesta ya recortada a 3, como haría Postgres).
    prisma.$queryRaw.mockResolvedValue([
      { id: 4, gatoId: 1, fecha: new Date('2026-04-01') },
      { id: 3, gatoId: 1, fecha: new Date('2026-03-01') },
      { id: 2, gatoId: 1, fecha: new Date('2026-02-01') },
      { id: 10, gatoId: 2, fecha: new Date('2026-05-01') },
    ]);

    const [registrosGato1, registrosGato2, registrosGatoSinHistorial] = await Promise.all([
      loaders.registrosClinicosPorGato.load(1),
      loaders.registrosClinicosPorGato.load(2),
      loaders.registrosClinicosPorGato.load(3),
    ]);

    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    expect((registrosGato1 as Array<{ id: number }>).map((r) => r.id)).toEqual([4, 3, 2]);
    expect(registrosGato2).toEqual([{ id: 10, gatoId: 2, fecha: new Date('2026-05-01') }]);
    expect(registrosGatoSinHistorial).toEqual([]);
  });
});
