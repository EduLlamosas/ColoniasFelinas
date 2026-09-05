import { AuthResolver } from './auth.resolver.js';
import type { AuthService } from './auth.service.js';

function createServiceMock() {
  return { register: vi.fn(), login: vi.fn() };
}

describe('AuthResolver', () => {
  let service: ReturnType<typeof createServiceMock>;
  let resolver: AuthResolver;

  beforeEach(() => {
    service = createServiceMock();
    resolver = new AuthResolver(service as unknown as AuthService);
  });

  it('register() delega en authService.register con el input', async () => {
    const data = { email: 'a@b.com', password: 'secreto123', nombreCompleto: 'Ana' };
    service.register.mockResolvedValue({ accessToken: 't', usuario: {} });

    const result = await resolver.register(data as never);

    expect(service.register).toHaveBeenCalledWith(data);
    expect(result).toEqual({ accessToken: 't', usuario: {} });
  });

  it('login() delega en authService.login con el input', async () => {
    const data = { email: 'a@b.com', password: 'secreto123' };
    service.login.mockResolvedValue({ accessToken: 't', usuario: {} });

    const result = await resolver.login(data as never);

    expect(service.login).toHaveBeenCalledWith(data);
    expect(result).toEqual({ accessToken: 't', usuario: {} });
  });
});
