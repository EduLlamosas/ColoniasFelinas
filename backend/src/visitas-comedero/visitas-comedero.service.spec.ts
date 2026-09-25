import { VisitasComederoService } from './visitas-comedero.service.js';
import { runWithTenantContext } from '../prisma/tenant-context.js';
import type { PrismaService } from '../prisma/prisma.service.js';

const conOrganizacion = <T>(fn: () => T) =>
  runWithTenantContext({ organizacionId: 3, isSuperadmin: false }, fn);

function createPrismaMock() {
  return {
    visitaComedero: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
  };
}

describe('VisitasComederoService', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let service: VisitasComederoService;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new VisitasComederoService(prisma as unknown as PrismaService);
  });

  it('create() persiste la visita con los datos recibidos, el usuarioId y el organizacionId de la sesión', async () => {
    const data = { comederoId: 1, piensoSeco: true, agua: true };
    prisma.visitaComedero.create.mockResolvedValue({ id: 1, ...data, usuarioId: 7 });
    await conOrganizacion(() => service.create(data as never, 7));
    expect(prisma.visitaComedero.findUnique).not.toHaveBeenCalled();
    expect(prisma.visitaComedero.create).toHaveBeenCalledWith({
      data: { ...data, usuarioId: 7, organizacionId: 3 },
    });
  });

  it('create() con idempotencyKey nueva comprueba que no exista y crea la visita normalmente', async () => {
    const data = { comederoId: 1, agua: true, idempotencyKey: 'clave-nueva' };
    prisma.visitaComedero.findUnique.mockResolvedValue(null);
    prisma.visitaComedero.create.mockResolvedValue({ id: 1, ...data, usuarioId: 7 });

    await conOrganizacion(() => service.create(data as never, 7));

    expect(prisma.visitaComedero.findUnique).toHaveBeenCalledWith({
      where: { idempotencyKey: 'clave-nueva' },
    });
    expect(prisma.visitaComedero.create).toHaveBeenCalledWith({
      data: { ...data, usuarioId: 7, organizacionId: 3 },
    });
  });

  it('create() con una idempotencyKey ya usada devuelve la visita existente sin crear una nueva', async () => {
    const existente = { id: 1, comederoId: 1, agua: true, idempotencyKey: 'clave-repetida', usuarioId: 7 };
    prisma.visitaComedero.findUnique.mockResolvedValue(existente);

    const resultado = await conOrganizacion(() =>
      service.create({ comederoId: 1, agua: true, idempotencyKey: 'clave-repetida' } as never, 7),
    );

    expect(resultado).toEqual(existente);
    expect(prisma.visitaComedero.create).not.toHaveBeenCalled();
  });

  it('findByComedero() filtra por comederoId y ordena por fecha descendente', async () => {
    prisma.visitaComedero.findMany.mockResolvedValue(['x']);
    expect(await service.findByComedero(1)).toEqual(['x']);
    expect(prisma.visitaComedero.findMany).toHaveBeenCalledWith({
      where: { comederoId: 1 },
      orderBy: { createdAt: 'desc' },
    });
  });
});
