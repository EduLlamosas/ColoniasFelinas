import { RegistrosClinicosResolver } from './registros-clinicos.resolver.js';
import type { RegistrosClinicosService } from './registros-clinicos.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';

function createServiceMock() {
  return {
    create: vi.fn(),
    findByGato: vi.fn(),
  };
}

function createPrismaMock() {
  return { usuario: { findUnique: vi.fn() } };
}

describe('RegistrosClinicosResolver', () => {
  let service: ReturnType<typeof createServiceMock>;
  let prisma: ReturnType<typeof createPrismaMock>;
  let resolver: RegistrosClinicosResolver;

  beforeEach(() => {
    service = createServiceMock();
    prisma = createPrismaMock();
    resolver = new RegistrosClinicosResolver(
      service as unknown as RegistrosClinicosService,
      prisma as unknown as PrismaService,
    );
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

  it('resolveUsuario() busca al usuario por usuarioId', async () => {
    prisma.usuario.findUnique.mockResolvedValue({ id: '7' });
    const resultado = await resolver.resolveUsuario({ usuarioId: 7 } as never);
    expect(resultado).toEqual({ id: '7' });
    expect(prisma.usuario.findUnique).toHaveBeenCalledWith({ where: { id: 7 } });
  });

  it('resolveUsuario() devuelve null si el registro no tiene usuarioId (previo a este campo)', async () => {
    expect(await resolver.resolveUsuario({ usuarioId: null } as never)).toBeNull();
    expect(prisma.usuario.findUnique).not.toHaveBeenCalled();
  });
});
