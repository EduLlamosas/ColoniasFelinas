import { ComederosResolver } from './comederos.resolver.js';
import type { ComederosService } from './comederos.service.js';
import type { GqlContext } from '../graphql/dataloaders.js';

function createServiceMock() {
  return {
    findAll: vi.fn(),
    findOne: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  };
}

function createContextMock() {
  return { loaders: { ultimaVisitaPorComedero: { load: vi.fn() } } } as unknown as GqlContext;
}

describe('ComederosResolver', () => {
  let service: ReturnType<typeof createServiceMock>;
  let ctx: ReturnType<typeof createContextMock>;
  let resolver: ComederosResolver;

  beforeEach(() => {
    service = createServiceMock();
    ctx = createContextMock();
    resolver = new ComederosResolver(service as unknown as ComederosService);
  });

  it('findAll() delega en el service', async () => {
    service.findAll.mockResolvedValue(['x']);
    expect(await resolver.findAll()).toEqual(['x']);
  });

  it('findAll(coloniaId) delega en el service con el filtro', async () => {
    service.findAll.mockResolvedValue(['x']);
    expect(await resolver.findAll(1)).toEqual(['x']);
    expect(service.findAll).toHaveBeenCalledWith(1);
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

  it('ultimaVisita() delega en el DataLoader con el id numérico del comedero', () => {
    resolver.ultimaVisita({ id: '1' } as never, ctx);
    expect(ctx.loaders.ultimaVisitaPorComedero.load).toHaveBeenCalledWith(1);
  });
});
