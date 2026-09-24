import { RegistrosClinicosResolver } from './registros-clinicos.resolver.js';
import type { RegistrosClinicosService } from './registros-clinicos.service.js';
import type { GqlContext } from '../graphql/dataloaders.js';

function createServiceMock() {
  return {
    create: vi.fn(),
    findByGato: vi.fn(),
  };
}

function createContextMock() {
  return { loaders: { usuarioPorId: { load: vi.fn() } } } as unknown as GqlContext;
}

describe('RegistrosClinicosResolver', () => {
  let service: ReturnType<typeof createServiceMock>;
  let ctx: ReturnType<typeof createContextMock>;
  let resolver: RegistrosClinicosResolver;

  beforeEach(() => {
    service = createServiceMock();
    ctx = createContextMock();
    resolver = new RegistrosClinicosResolver(service as unknown as RegistrosClinicosService);
  });

  it('findByGato() delega en el service con gatoId', async () => {
    service.findByGato.mockResolvedValue(['x']);
    expect(await resolver.findByGato(1)).toEqual(['x']);
    expect(service.findByGato).toHaveBeenCalledWith(1);
  });

  it('registrarIntervencionMedica() delega en el service con el input y el id del usuario autenticado', async () => {
    const data = { gatoId: 1, tipo: 'VACUNACION', fecha: '2026-01-01', diagnostico: 'x', nuevoEstadoCer: 'CAPTURADO' };
    const user = { sub: 7, email: 'a@a.es', rol: 'GESTOR' } as never;
    await resolver.registrarIntervencionMedica(data as never, user);
    expect(service.create).toHaveBeenCalledWith(data, 7);
  });

  it('resolveUsuario() delega en el DataLoader con usuarioId', () => {
    resolver.resolveUsuario({ usuarioId: 7 } as never, ctx);
    expect(ctx.loaders.usuarioPorId.load).toHaveBeenCalledWith(7);
  });

  it('resolveUsuario() devuelve null si el registro no tiene usuarioId (previo a este campo), sin llamar al loader', () => {
    expect(resolver.resolveUsuario({ usuarioId: null } as never, ctx)).toBeNull();
    expect(ctx.loaders.usuarioPorId.load).not.toHaveBeenCalled();
  });
});
