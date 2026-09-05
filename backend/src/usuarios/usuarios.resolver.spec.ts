import { UsuariosResolver } from './usuarios.resolver.js';
import type { UsuariosService } from './usuarios.service.js';

function createServiceMock() {
  return { findById: vi.fn() };
}

describe('UsuariosResolver', () => {
  let service: ReturnType<typeof createServiceMock>;
  let resolver: UsuariosResolver;

  beforeEach(() => {
    service = createServiceMock();
    resolver = new UsuariosResolver(service as unknown as UsuariosService);
  });

  it('me() busca al usuario por el sub del payload del JWT, no por el email', async () => {
    service.findById.mockResolvedValue({ id: 1, email: 'a@b.com' });

    const result = await resolver.me({ sub: 1, email: 'a@b.com', rol: 'GESTOR' });

    expect(service.findById).toHaveBeenCalledWith(1);
    expect(result).toEqual({ id: 1, email: 'a@b.com' });
  });
});
