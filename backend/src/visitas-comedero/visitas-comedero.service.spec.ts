import { VisitasComederoService } from './visitas-comedero.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';

function createPrismaMock() {
  return {
    visitaComedero: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
  };
}

describe('VisitasComederoService', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let service: VisitasComederoService;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new VisitasComederoService(prisma as unknown as PrismaService);
  });

  it('create() persiste la visita con los datos recibidos y el usuarioId por separado', async () => {
    const data = { comederoId: 1, piensoSeco: true, agua: true };
    prisma.visitaComedero.create.mockResolvedValue({ id: 1, ...data, usuarioId: 7 });
    await service.create(data as never, 7);
    expect(prisma.visitaComedero.create).toHaveBeenCalledWith({ data: { ...data, usuarioId: 7 } });
  });

  it('findByComedero() filtra por comederoId y ordena por fecha descendente', async () => {
    prisma.visitaComedero.findMany.mockResolvedValue(['x']);
    expect(await service.findByComedero(1)).toEqual(['x']);
    expect(prisma.visitaComedero.findMany).toHaveBeenCalledWith({
      where: { comederoId: 1 },
      orderBy: { createdAt: 'desc' },
    });
  });
});
