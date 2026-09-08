import { VisitasComederoResolver } from './visitas-comedero.resolver.js';
import type { VisitasComederoService } from './visitas-comedero.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';

function createServiceMock() {
  return {
    create: vi.fn(),
    findByComedero: vi.fn(),
  };
}

function createPrismaMock() {
  return { usuario: { findUnique: vi.fn() } };
}

describe('VisitasComederoResolver', () => {
  let service: ReturnType<typeof createServiceMock>;
  let prisma: ReturnType<typeof createPrismaMock>;
  let resolver: VisitasComederoResolver;

  beforeEach(() => {
    service = createServiceMock();
    prisma = createPrismaMock();
    resolver = new VisitasComederoResolver(
      service as unknown as VisitasComederoService,
      prisma as unknown as PrismaService,
    );
  });

  it('findByComedero() delega en el service con comederoId', async () => {
    service.findByComedero.mockResolvedValue(['x']);
    expect(await resolver.findByComedero(1)).toEqual(['x']);
    expect(service.findByComedero).toHaveBeenCalledWith(1);
  });

  it('registrarVisitaComedero() delega en el service con el input y el id del usuario autenticado', async () => {
    const data = { comederoId: 1, piensoSeco: true };
    const user = { sub: 7, email: 'a@a.es', rol: 'GESTOR' } as never;
    await resolver.registrarVisitaComedero(data as never, user);
    expect(service.create).toHaveBeenCalledWith(data, 7);
  });

  it('resolveUsuario() busca al usuario por usuarioId', async () => {
    prisma.usuario.findUnique.mockResolvedValue({ id: '7' });
    const resultado = await resolver.resolveUsuario({ usuarioId: 7 } as never);
    expect(resultado).toEqual({ id: '7' });
    expect(prisma.usuario.findUnique).toHaveBeenCalledWith({ where: { id: 7 } });
  });

  it('resolveUsuario() devuelve null si la traza no tiene usuarioId (registro previo al campo)', async () => {
    expect(await resolver.resolveUsuario({ usuarioId: null } as never)).toBeNull();
    expect(prisma.usuario.findUnique).not.toHaveBeenCalled();
  });
});
