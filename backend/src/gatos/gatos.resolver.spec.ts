import { GatosResolver } from './gatos.resolver.js';
import type { GatosService } from './gatos.service.js';

function createServiceMock() {
  return {
    findAll: vi.fn(),
    findOne: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  };
}

describe('GatosResolver', () => {
  let service: ReturnType<typeof createServiceMock>;
  let resolver: GatosResolver;

  beforeEach(() => {
    service = createServiceMock();
    resolver = new GatosResolver(service as unknown as GatosService);
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

  it('createGato() delega en el service con el input', async () => {
    const data = { coloniaId: 'c1', sexo: 'MACHO', capaPelaje: 'x', estadoCer: 'AVISTADO' };
    await resolver.createGato(data as never);
    expect(service.create).toHaveBeenCalledWith(data);
  });

  it('updateGato() delega en el service con id y datos por separado', async () => {
    const data = { nombre: 'Michi' };
    await resolver.updateGato('1', data as never);
    expect(service.update).toHaveBeenCalledWith('1', data);
  });

  it('removeGato() delega en el service con el id', async () => {
    await resolver.removeGato('1');
    expect(service.remove).toHaveBeenCalledWith('1');
  });
});
