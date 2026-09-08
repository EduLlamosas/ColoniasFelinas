import { BadRequestException, NotFoundException } from '@nestjs/common';
import { RegistrosClinicosService } from './registros-clinicos.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';

function createPrismaMock() {
  const tx = {
    gato: { update: vi.fn() },
    registroClinico: { create: vi.fn() },
  };
  return {
    $transaction: vi.fn((callback: (transaction: typeof tx) => unknown) => callback(tx)),
    gato: { findUnique: vi.fn() },
    registroClinico: { findMany: vi.fn() },
    tx,
  };
}

describe('RegistrosClinicosService', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let service: RegistrosClinicosService;

  beforeEach(() => {
    prisma = createPrismaMock();
    prisma.gato.findUnique.mockResolvedValue({ fechaNacimiento: null });
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

    expect(prisma.gato.findUnique).toHaveBeenCalledWith({
      where: { id: 1 },
      select: { fechaNacimiento: true },
    });
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

  it('create() rechaza una fecha futura sin llegar a tocar la base de datos', async () => {
    const enUnAno = new Date();
    enUnAno.setFullYear(enUnAno.getFullYear() + 1);
    const data = {
      gatoId: 1,
      tipo: 'VACUNACION',
      fecha: enUnAno.toISOString(),
      diagnostico: 'x',
      nuevoEstadoCer: 'CAPTURADO',
    };

    await expect(service.create(data as never, 7)).rejects.toThrow(BadRequestException);
    expect(prisma.gato.findUnique).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('create() lanza NotFoundException si el gato no existe', async () => {
    prisma.gato.findUnique.mockResolvedValue(null);
    const data = { gatoId: 999, tipo: 'VACUNACION', fecha: '2026-01-01', diagnostico: 'x', nuevoEstadoCer: 'CAPTURADO' };

    await expect(service.create(data as never, 7)).rejects.toThrow(NotFoundException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('create() acepta una fecha hasta 5 años antes del nacimiento estimado (margen por estimación imprecisa)', async () => {
    prisma.gato.findUnique.mockResolvedValue({ fechaNacimiento: new Date('2020-01-01') });
    const data = {
      gatoId: 1,
      tipo: 'VACUNACION',
      fecha: '2016-06-01', // dentro del margen de 5 años antes de 2020-01-01
      diagnostico: 'x',
      nuevoEstadoCer: 'CAPTURADO',
    };
    prisma.tx.registroClinico.create.mockResolvedValue({ id: 1 });

    await expect(service.create(data as never, 7)).resolves.toBeDefined();
  });

  it('create() rechaza una fecha más de 5 años anterior al nacimiento estimado del gato', async () => {
    prisma.gato.findUnique.mockResolvedValue({ fechaNacimiento: new Date('2020-01-01') });
    const data = {
      gatoId: 1,
      tipo: 'VACUNACION',
      fecha: '2014-01-01', // más de 5 años antes de 2020-01-01
      diagnostico: 'x',
      nuevoEstadoCer: 'CAPTURADO',
    };

    await expect(service.create(data as never, 7)).rejects.toThrow(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
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
