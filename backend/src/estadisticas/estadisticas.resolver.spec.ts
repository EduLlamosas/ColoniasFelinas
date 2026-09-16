import { EstadisticasResolver } from './estadisticas.resolver.js';
import type { EstadisticasService } from './estadisticas.service.js';

function createServiceMock() {
  return { obtenerTodas: vi.fn() };
}

describe('EstadisticasResolver', () => {
  let service: ReturnType<typeof createServiceMock>;
  let resolver: EstadisticasResolver;

  beforeEach(() => {
    service = createServiceMock();
    resolver = new EstadisticasResolver(service as unknown as EstadisticasService);
  });

  it('usa 7 días por defecto si no se manda diasSinVisita', async () => {
    service.obtenerTodas.mockResolvedValue('x');
    expect(await resolver.obtenerEstadisticas()).toBe('x');
    expect(service.obtenerTodas).toHaveBeenCalledWith(7);
  });

  it('respeta el diasSinVisita explícito', async () => {
    service.obtenerTodas.mockResolvedValue('x');
    await resolver.obtenerEstadisticas(14);
    expect(service.obtenerTodas).toHaveBeenCalledWith(14);
  });
});
