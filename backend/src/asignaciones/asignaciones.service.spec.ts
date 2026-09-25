import { NotFoundException } from '@nestjs/common';
import { AsignacionesService } from './asignaciones.service.js';
import { runWithTenantContext } from '../prisma/tenant-context.js';
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

  it('create() delega en prisma.asignacionVoluntario.create, con el organizacionId de la sesión', async () => {
    const data = { voluntarioId: 1, coloniaId: 2, rolAsignado: 'SUPERVISOR' };
    prisma.asignacionVoluntario.create.mockResolvedValue(data);

    const result = await runWithTenantContext({ organizacionId: 7, isSuperadmin: false }, () =>
      service.create(data as never),
    );

    expect(prisma.asignacionVoluntario.create).toHaveBeenCalledWith({
      data: { ...data, organizacionId: 7 },
    });
    expect(result).toEqual(data);
  });

  it('findAll() sin filtros trae todas, sin where', async () => {
    prisma.asignacionVoluntario.findMany.mockResolvedValue([{ voluntarioId: 1 }]);
    expect(await service.findAll()).toEqual([{ voluntarioId: 1 }]);
    expect(prisma.asignacionVoluntario.findMany).toHaveBeenCalledWith({ where: {} });
  });

  it('findAll(coloniaId) filtra solo por colonia', async () => {
    prisma.asignacionVoluntario.findMany.mockResolvedValue([{ voluntarioId: 1 }]);
    expect(await service.findAll(3)).toEqual([{ voluntarioId: 1 }]);
    expect(prisma.asignacionVoluntario.findMany).toHaveBeenCalledWith({ where: { coloniaId: 3 } });
  });

  it('findAll(coloniaId, voluntarioId) filtra por ambos a la vez', async () => {
    prisma.asignacionVoluntario.findMany.mockResolvedValue([{ voluntarioId: 1 }]);
    expect(await service.findAll(3, 7)).toEqual([{ voluntarioId: 1 }]);
    expect(prisma.asignacionVoluntario.findMany).toHaveBeenCalledWith({
      where: { coloniaId: 3, voluntarioId: 7 },
    });
  });

  it('findOne() busca por id', async () => {
    prisma.asignacionVoluntario.findUnique.mockResolvedValue({ id: 5, voluntarioId: 1, coloniaId: 2 });

    const result = await service.findOne('5');

    expect(prisma.asignacionVoluntario.findUnique).toHaveBeenCalledWith({ where: { id: 5 } });
    expect(result).toEqual({ id: 5, voluntarioId: 1, coloniaId: 2 });
  });

  it('findOne() lanza NotFoundException cuando no existe la asignación', async () => {
    prisma.asignacionVoluntario.findUnique.mockResolvedValue(null);
    await expect(service.findOne('5')).rejects.toThrow(NotFoundException);
  });

  it('update() comprueba que existe antes de actualizar', async () => {
    prisma.asignacionVoluntario.findUnique.mockResolvedValue({ id: 5, voluntarioId: 1, coloniaId: 2 });
    prisma.asignacionVoluntario.update.mockResolvedValue({
      id: 5,
      voluntarioId: 1,
      coloniaId: 2,
      rolAsignado: 'CAPTURADOR',
    });

    const result = await service.update('5', { rolAsignado: 'CAPTURADOR' } as never);

    expect(prisma.asignacionVoluntario.update).toHaveBeenCalledWith({
      where: { id: 5 },
      data: { rolAsignado: 'CAPTURADOR' },
    });
    expect(result).toEqual({ id: 5, voluntarioId: 1, coloniaId: 2, rolAsignado: 'CAPTURADOR' });
  });

  it('update() propaga el NotFoundException sin llegar a llamar a update()', async () => {
    prisma.asignacionVoluntario.findUnique.mockResolvedValue(null);
    await expect(service.update('5', {} as never)).rejects.toThrow(NotFoundException);
    expect(prisma.asignacionVoluntario.update).not.toHaveBeenCalled();
  });

  it('remove() comprueba que existe antes de borrar', async () => {
    prisma.asignacionVoluntario.findUnique.mockResolvedValue({ id: 5, voluntarioId: 1, coloniaId: 2 });
    prisma.asignacionVoluntario.delete.mockResolvedValue({ id: 5, voluntarioId: 1, coloniaId: 2 });

    const result = await service.remove('5');

    expect(prisma.asignacionVoluntario.delete).toHaveBeenCalledWith({ where: { id: 5 } });
    expect(result).toEqual({ id: 5, voluntarioId: 1, coloniaId: 2 });
  });

  it('remove() propaga el NotFoundException sin llegar a llamar a delete()', async () => {
    prisma.asignacionVoluntario.findUnique.mockResolvedValue(null);
    await expect(service.remove('5')).rejects.toThrow(NotFoundException);
    expect(prisma.asignacionVoluntario.delete).not.toHaveBeenCalled();
  });
});
