vi.mock('bcrypt', () => ({
  hash: vi.fn(),
  compare: vi.fn(),
}));

import * as bcrypt from 'bcrypt';
import { UsuariosService } from './usuarios.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';

function createPrismaMock() {
  return {
    usuario: {
      create: vi.fn(),
      findUnique: vi.fn(),
    },
  };
}

describe('UsuariosService', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let service: UsuariosService;

  beforeEach(() => {
    vi.clearAllMocks();
    prisma = createPrismaMock();
    service = new UsuariosService(prisma as unknown as PrismaService);
  });

  it('create() hashea la contraseña y fuerza el rol GESTOR, ignorando cualquier otro valor', async () => {
    vi.mocked(bcrypt.hash).mockResolvedValue('hash-simulado' as never);
    prisma.usuario.create.mockResolvedValue({ id: '1', email: 'a@b.com', rol: 'GESTOR' });

    const result = await service.create({
      email: 'a@b.com',
      password: 'secreto123',
      nombreCompleto: 'Ana',
    });

    expect(bcrypt.hash).toHaveBeenCalledWith('secreto123', 10);
    expect(prisma.usuario.create).toHaveBeenCalledWith({
      data: {
        email: 'a@b.com',
        passwordHash: 'hash-simulado',
        nombreCompleto: 'Ana',
        rol: 'GESTOR',
      },
    });
    expect(result).toEqual({ id: '1', email: 'a@b.com', rol: 'GESTOR' });
  });

  it('findByEmail() delega en prisma.usuario.findUnique por email', async () => {
    prisma.usuario.findUnique.mockResolvedValue({ id: '1' });
    const result = await service.findByEmail('a@b.com');
    expect(prisma.usuario.findUnique).toHaveBeenCalledWith({ where: { email: 'a@b.com' } });
    expect(result).toEqual({ id: '1' });
  });

  it('findById() delega en prisma.usuario.findUnique por id', async () => {
    prisma.usuario.findUnique.mockResolvedValue({ id: 1 });
    const result = await service.findById(1);
    expect(prisma.usuario.findUnique).toHaveBeenCalledWith({ where: { id: 1 } });
    expect(result).toEqual({ id: 1 });
  });
});
