import { VisitasComederoResolver } from './visitas-comedero.resolver.js';
import type { VisitasComederoService } from './visitas-comedero.service.js';

function createServiceMock() {
  return {
    create: vi.fn(),
    findByComedero: vi.fn(),
  };
}

describe('VisitasComederoResolver', () => {
  let service: ReturnType<typeof createServiceMock>;
  let resolver: VisitasComederoResolver;

  beforeEach(() => {
    service = createServiceMock();
    resolver = new VisitasComederoResolver(service as unknown as VisitasComederoService);
  });

  it('findByComedero() delega en el service con comederoId', async () => {
    service.findByComedero.mockResolvedValue(['x']);
    expect(await resolver.findByComedero(1)).toEqual(['x']);
    expect(service.findByComedero).toHaveBeenCalledWith(1);
  });

  it('registrarVisitaComedero() delega en el service con el input', async () => {
    const data = { comederoId: 1, piensoSeco: true };
    await resolver.registrarVisitaComedero(data as never);
    expect(service.create).toHaveBeenCalledWith(data);
  });
});
