import { RegistrosClinicosService } from './registros-clinicos.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';

function createPrismaMock() {
  const tx = {
    gato: { update: vi.fn() },
    registroClinico: { create: vi.fn() },
  };
  return {
    $transaction: vi.fn((callback: (transaction: typeof tx) => unknown) => callback(tx)),
    registroClinico: { findMany: vi.fn() },
    tx,
  };
}

describe('RegistrosClinicosService', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let service: RegistrosClinicosService;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new RegistrosClinicosService(prisma as unknown as PrismaService);
  });

  it('create() actualiza el estado_cer del gato y crea el registro clínico en la misma transacción', async () => {
    const data = {
      gatoId: 1,
      tipo: 'ESTERILIZACION',
      fecha: '2026-01-01',
      diagnostico: 'Sin incidencias',
      nuevoEstadoCer: 'ESTERILIZADO',
    };
    prisma.tx.registroClinico.create.mockResolvedValue({ id: 1, ...data, usuarioId: 7 });

    await service.create(data as never, 7);

    expect(prisma.tx.gato.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { estadoCer: 'ESTERILIZADO' },
    });
    expect(prisma.tx.registroClinico.create).toHaveBeenCalledWith({
      data: {
        gatoId: 1,
        usuarioId: 7,
        tipo: 'ESTERILIZACION',
        fecha: new Date('2026-01-01'),
        diagnostico: 'Sin incidencias',
      },
    });
  });

  it('findByGato() filtra por gatoId y ordena por fecha descendente', async () => {
    prisma.registroClinico.findMany.mockResolvedValue(['x']);
    expect(await service.findByGato(1)).toEqual(['x']);
    expect(prisma.registroClinico.findMany).toHaveBeenCalledWith({
      where: { gatoId: 1 },
      orderBy: { fecha: 'desc' },
    });
  });
});
