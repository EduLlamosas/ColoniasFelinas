import { NotFoundException } from '@nestjs/common';
import { AsignacionesService } from './asignaciones.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';

function createPrismaMock() {
  return {
    asignacionVoluntario: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  };
}

describe('AsignacionesService', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let service: AsignacionesService;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new AsignacionesService(prisma as unknown as PrismaService);
  });

  it('create() delega en prisma.asignacionVoluntario.create', async () => {
    const data = { voluntarioId: 1, coloniaId: 2, rolAsignado: 'SUPERVISOR' };
    prisma.asignacionVoluntario.create.mockResolvedValue(data);

    const result = await service.create(data as never);

    expect(prisma.asignacionVoluntario.create).toHaveBeenCalledWith({ data });
    expect(result).toEqual(data);
  });

  it('findAll() delega en prisma.asignacionVoluntario.findMany', async () => {
    prisma.asignacionVoluntario.findMany.mockResolvedValue([{ voluntarioId: 1 }]);
    expect(await service.findAll()).toEqual([{ voluntarioId: 1 }]);
  });

  it('findOne() busca por la clave compuesta voluntarioId_coloniaId', async () => {
    prisma.asignacionVoluntario.findUnique.mockResolvedValue({ voluntarioId: 1, coloniaId: 2 });

    const result = await service.findOne(1, 2);

    expect(prisma.asignacionVoluntario.findUnique).toHaveBeenCalledWith({
      where: { voluntarioId_coloniaId: { voluntarioId: 1, coloniaId: 2 } },
    });
    expect(result).toEqual({ voluntarioId: 1, coloniaId: 2 });
  });

  it('findOne() lanza NotFoundException cuando no existe la asignación', async () => {
    prisma.asignacionVoluntario.findUnique.mockResolvedValue(null);
    await expect(service.findOne(1, 2)).rejects.toThrow(NotFoundException);
  });

  it('update() comprueba que existe antes de actualizar, con ambos ids', async () => {
    prisma.asignacionVoluntario.findUnique.mockResolvedValue({ voluntarioId: 1, coloniaId: 2 });
    prisma.asignacionVoluntario.update.mockResolvedValue({
      voluntarioId: 1,
      coloniaId: 2,
      rolAsignado: 'CAPTURADOR',
    });

    const result = await service.update(1, 2, { rolAsignado: 'CAPTURADOR' } as never);

    expect(prisma.asignacionVoluntario.update).toHaveBeenCalledWith({
      where: { voluntarioId_coloniaId: { voluntarioId: 1, coloniaId: 2 } },
      data: { rolAsignado: 'CAPTURADOR' },
    });
    expect(result).toEqual({ voluntarioId: 1, coloniaId: 2, rolAsignado: 'CAPTURADOR' });
  });

  it('update() propaga el NotFoundException sin llegar a llamar a update()', async () => {
    prisma.asignacionVoluntario.findUnique.mockResolvedValue(null);
    await expect(service.update(1, 2, {} as never)).rejects.toThrow(NotFoundException);
    expect(prisma.asignacionVoluntario.update).not.toHaveBeenCalled();
  });

  it('remove() comprueba que existe antes de borrar, con ambos ids', async () => {
    prisma.asignacionVoluntario.findUnique.mockResolvedValue({ voluntarioId: 1, coloniaId: 2 });
    prisma.asignacionVoluntario.delete.mockResolvedValue({ voluntarioId: 1, coloniaId: 2 });

    const result = await service.remove(1, 2);

    expect(prisma.asignacionVoluntario.delete).toHaveBeenCalledWith({
      where: { voluntarioId_coloniaId: { voluntarioId: 1, coloniaId: 2 } },
    });
    expect(result).toEqual({ voluntarioId: 1, coloniaId: 2 });
  });

  it('remove() propaga el NotFoundException sin llegar a llamar a delete()', async () => {
    prisma.asignacionVoluntario.findUnique.mockResolvedValue(null);
    await expect(service.remove(1, 2)).rejects.toThrow(NotFoundException);
    expect(prisma.asignacionVoluntario.delete).not.toHaveBeenCalled();
  });
});
