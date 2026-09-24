import { ColoniasResolver } from './colonias.resolver.js';
import type { ColoniasService } from './colonias.service.js';
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
  return {
    loaders: {
      gatosPorColonia: { load: vi.fn() },
      comederosPorColonia: { load: vi.fn() },
      asignacionesPorColonia: { load: vi.fn() },
    },
  } as unknown as GqlContext;
}

describe('ColoniasResolver', () => {
  let service: ReturnType<typeof createServiceMock>;
  let ctx: ReturnType<typeof createContextMock>;
  let resolver: ColoniasResolver;

  beforeEach(() => {
    service = createServiceMock();
    ctx = createContextMock();
    resolver = new ColoniasResolver(service as unknown as ColoniasService);
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

  it('createColonia() delega en el service con el input', async () => {
    const data = { nombre: 'X' };
    service.create.mockResolvedValue({ id: '1', ...data });
    await resolver.createColonia(data as never);
    expect(service.create).toHaveBeenCalledWith(data);
  });

  it('updateColonia() delega en el service con id y datos por separado', async () => {
    const data = { nombre: 'Nuevo' };
    await resolver.updateColonia('1', data as never);
    expect(service.update).toHaveBeenCalledWith('1', data);
  });

  it('removeColonia() delega en el service con el id y devuelve true', async () => {
    expect(await resolver.removeColonia('1')).toBe(true);
    expect(service.remove).toHaveBeenCalledWith('1');
  });

  // Los tres siguientes son lo que permite anidar "colonia { gatos { ... } }" en una sola query
  // (ver dataloaders.ts) - cada uno delega en su DataLoader con el id numérico de la colonia.
  it('resolveGatos() delega en el DataLoader con el id de la colonia', () => {
    resolver.resolveGatos({ id: '1' } as never, ctx);
    expect(ctx.loaders.gatosPorColonia.load).toHaveBeenCalledWith(1);
  });

  it('resolveComederos() delega en el DataLoader con el id de la colonia', () => {
    resolver.resolveComederos({ id: '1' } as never, ctx);
    expect(ctx.loaders.comederosPorColonia.load).toHaveBeenCalledWith(1);
  });

  it('resolveAsignaciones() delega en el DataLoader con el id de la colonia', () => {
    resolver.resolveAsignaciones({ id: '1' } as never, ctx);
    expect(ctx.loaders.asignacionesPorColonia.load).toHaveBeenCalledWith(1);
  });
});
