import { ComederosResolver } from './comederos.resolver.js';
import type { ComederosService } from './comederos.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';

function createServiceMock() {
  return {
    findAll: vi.fn(),
    findOne: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  };
}

function createPrismaMock() {
  return { visitaComedero: { findFirst: vi.fn() } };
}

describe('ComederosResolver', () => {
  let service: ReturnType<typeof createServiceMock>;
  let prisma: ReturnType<typeof createPrismaMock>;
  let resolver: ComederosResolver;

  beforeEach(() => {
    service = createServiceMock();
    prisma = createPrismaMock();
    resolver = new ComederosResolver(
      service as unknown as ComederosService,
      prisma as unknown as PrismaService,
    );
  });

  it('findAll() delega en el service', async () => {
    service.findAll.mockResolvedValue(['x']);
    expect(await resolver.findAll()).toEqual(['x']);
  });

  it('findOne() delega en el service con el id', async () => {
    service.findOne.mockResolvedValue({ id: '1' });
    expect(await resolver.findOne('1')).toEqual({ id: '1' });
    expect(service.findOne).toHaveBeenCalledWith('1');
  });

  it('createComedero() delega en el service con el input', async () => {
    const data = { coloniaId: 'c1', ubicacionDetallada: 'x' };
    await resolver.createComedero(data as never);
    expect(service.create).toHaveBeenCalledWith(data);
  });

  it('updateComedero() delega en el service con id y datos por separado', async () => {
    const data = { ubicacionDetallada: 'nueva' };
    await resolver.updateComedero('1', data as never);
    expect(service.update).toHaveBeenCalledWith('1', data);
  });

  it('removeComedero() delega en el service con el id y devuelve true', async () => {
    expect(await resolver.removeComedero('1')).toBe(true);
    expect(service.remove).toHaveBeenCalledWith('1');
  });

  it('ultimaVisita() devuelve la fecha de la visita más reciente del comedero', async () => {
    prisma.visitaComedero.findFirst.mockResolvedValue({ createdAt: new Date('2026-01-01') });
    const resultado = await resolver.ultimaVisita({ id: '1' } as never);
    expect(resultado).toEqual(new Date('2026-01-01'));
    expect(prisma.visitaComedero.findFirst).toHaveBeenCalledWith({
      where: { comederoId: 1 },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });
  });

  it('ultimaVisita() devuelve null si el comedero no tiene visitas', async () => {
    prisma.visitaComedero.findFirst.mockResolvedValue(null);
    expect(await resolver.ultimaVisita({ id: '1' } as never)).toBeNull();
  });
});
