import { RegistrosClinicosResolver } from './registros-clinicos.resolver.js';
import type { RegistrosClinicosService } from './registros-clinicos.service.js';

function createServiceMock() {
  return {
    create: vi.fn(),
    findByGato: vi.fn(),
  };
}

describe('RegistrosClinicosResolver', () => {
  let service: ReturnType<typeof createServiceMock>;
  let resolver: RegistrosClinicosResolver;

  beforeEach(() => {
    service = createServiceMock();
    resolver = new RegistrosClinicosResolver(service as unknown as RegistrosClinicosService);
  });

  it('findByGato() delega en el service con gatoId', async () => {
    service.findByGato.mockResolvedValue(['x']);
    expect(await resolver.findByGato(1)).toEqual(['x']);
    expect(service.findByGato).toHaveBeenCalledWith(1);
  });

  it('registrarIntervencionMedica() delega en el service con el input', async () => {
    const data = { gatoId: 1, tipo: 'VACUNACION', fecha: '2026-01-01', diagnostico: 'x', nuevoEstadoCer: 'CAPTURADO' };
    await resolver.registrarIntervencionMedica(data as never);
    expect(service.create).toHaveBeenCalledWith(data);
  });
});
