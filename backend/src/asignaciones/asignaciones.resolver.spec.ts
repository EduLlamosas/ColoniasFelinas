import { AsignacionesResolver } from './asignaciones.resolver.js';
import type { AsignacionesService } from './asignaciones.service.js';

function createServiceMock() {
  return {
    findAll: vi.fn(),
    findOne: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  };
}

describe('AsignacionesResolver', () => {
  let service: ReturnType<typeof createServiceMock>;
  let resolver: AsignacionesResolver;

  beforeEach(() => {
    service = createServiceMock();
    resolver = new AsignacionesResolver(service as unknown as AsignacionesService);
  });

  it('findAll() delega en el service', async () => {
    service.findAll.mockResolvedValue(['x']);
    expect(await resolver.findAll()).toEqual(['x']);
  });

  it('findOne() delega en el service con voluntarioId y coloniaId por separado', async () => {
    service.findOne.mockResolvedValue({ voluntarioId: 1, coloniaId: 2 });
    expect(await resolver.findOne(1, 2)).toEqual({ voluntarioId: 1, coloniaId: 2 });
    expect(service.findOne).toHaveBeenCalledWith(1, 2);
  });

  it('createAsignacion() delega en el service con el input', async () => {
    const data = { voluntarioId: 1, coloniaId: 2, rolAsignado: 'SUPERVISOR' };
    await resolver.createAsignacion(data as never);
    expect(service.create).toHaveBeenCalledWith(data);
  });

  it('updateAsignacion() delega en el service con ambos ids y los datos por separado', async () => {
    const data = { rolAsignado: 'CAPTURADOR' };
    await resolver.updateAsignacion(1, 2, data as never);
    expect(service.update).toHaveBeenCalledWith(1, 2, data);
  });

  it('removeAsignacion() delega en el service con ambos ids', async () => {
    await resolver.removeAsignacion(1, 2);
    expect(service.remove).toHaveBeenCalledWith(1, 2);
  });
});
