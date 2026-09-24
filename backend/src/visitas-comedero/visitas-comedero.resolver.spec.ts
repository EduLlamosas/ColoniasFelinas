import { VisitasComederoResolver } from './visitas-comedero.resolver.js';
import type { VisitasComederoService } from './visitas-comedero.service.js';
import type { GqlContext } from '../graphql/dataloaders.js';

function createServiceMock() {
  return {
    create: vi.fn(),
    findByComedero: vi.fn(),
  };
}

function createContextMock() {
  return { loaders: { usuarioPorId: { load: vi.fn() } } } as unknown as GqlContext;
}

describe('VisitasComederoResolver', () => {
  let service: ReturnType<typeof createServiceMock>;
  let ctx: ReturnType<typeof createContextMock>;
  let resolver: VisitasComederoResolver;

  beforeEach(() => {
    service = createServiceMock();
    ctx = createContextMock();
    resolver = new VisitasComederoResolver(service as unknown as VisitasComederoService);
  });

  it('findByComedero() delega en el service con comederoId', async () => {
    service.findByComedero.mockResolvedValue(['x']);
    expect(await resolver.findByComedero(1)).toEqual(['x']);
    expect(service.findByComedero).toHaveBeenCalledWith(1);
  });

  it('registrarVisitaComedero() delega en el service con el input y el id del usuario autenticado', async () => {
    const data = { comederoId: 1, piensoSeco: true };
    const user = { sub: 7, email: 'a@a.es', rol: 'GESTOR' } as never;
    await resolver.registrarVisitaComedero(data as never, user);
    expect(service.create).toHaveBeenCalledWith(data, 7);
  });

  it('resolveUsuario() delega en el DataLoader con usuarioId', () => {
    resolver.resolveUsuario({ usuarioId: 7 } as never, ctx);
    expect(ctx.loaders.usuarioPorId.load).toHaveBeenCalledWith(7);
  });

  it('resolveUsuario() devuelve null si la traza no tiene usuarioId (registro previo al campo), sin llamar al loader', () => {
    expect(resolver.resolveUsuario({ usuarioId: null } as never, ctx)).toBeNull();
    expect(ctx.loaders.usuarioPorId.load).not.toHaveBeenCalled();
  });
});
