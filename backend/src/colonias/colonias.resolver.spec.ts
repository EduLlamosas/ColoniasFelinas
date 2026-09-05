import { ColoniasResolver } from './colonias.resolver.js';
import type { ColoniasService } from './colonias.service.js';

function createServiceMock() {
  return {
    findAll: vi.fn(),
    findOne: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  };
}

describe('ColoniasResolver', () => {
  let service: ReturnType<typeof createServiceMock>;
  let resolver: ColoniasResolver;

  beforeEach(() => {
    service = createServiceMock();
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

  it('removeColonia() delega en el service con el id', async () => {
    await resolver.removeColonia('1');
    expect(service.remove).toHaveBeenCalledWith('1');
  });
});
