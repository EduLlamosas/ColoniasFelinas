import { VoluntariosResolver } from './voluntarios.resolver.js';
import type { VoluntariosService } from './voluntarios.service.js';

function createServiceMock() {
  return {
    findAll: vi.fn(),
    findOne: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  };
}

describe('VoluntariosResolver', () => {
  let service: ReturnType<typeof createServiceMock>;
  let resolver: VoluntariosResolver;

  beforeEach(() => {
    service = createServiceMock();
    resolver = new VoluntariosResolver(service as unknown as VoluntariosService);
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

  it('createVoluntario() delega en el service con el input', async () => {
    const data = { dni: '12345678Z', nombre: 'Ana' };
    await resolver.createVoluntario(data as never);
    expect(service.create).toHaveBeenCalledWith(data);
  });

  it('updateVoluntario() delega en el service con id y datos por separado', async () => {
    const data = { nombre: 'Nueva' };
    await resolver.updateVoluntario('1', data as never);
    expect(service.update).toHaveBeenCalledWith('1', data);
  });

  it('removeVoluntario() delega en el service con el id y devuelve true', async () => {
    expect(await resolver.removeVoluntario('1')).toBe(true);
    expect(service.remove).toHaveBeenCalledWith('1');
  });
});
