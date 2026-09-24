import { NotFoundException } from '@nestjs/common';
import { BenchmarkController } from './benchmark.controller.js';
import type { PrismaService } from '../prisma/prisma.service.js';

function createPrismaMock() {
  return {
    gato: { findUnique: vi.fn(), findMany: vi.fn() },
    colonia: { findUnique: vi.fn() },
    comedero: { findMany: vi.fn() },
    asignacionVoluntario: { findMany: vi.fn() },
  };
}

describe('BenchmarkController', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let controller: BenchmarkController;

  beforeEach(() => {
    prisma = createPrismaMock();
    controller = new BenchmarkController(prisma as unknown as PrismaService);
  });

  it('gato() devuelve la fila completa de Prisma sin selección de campos', async () => {
    prisma.gato.findUnique.mockResolvedValue({ id: 1, nombre: 'Michi' });
    expect(await controller.gato(1)).toEqual({ id: 1, nombre: 'Michi' });
    expect(prisma.gato.findUnique).toHaveBeenCalledWith({ where: { id: 1 } });
  });

  it('gato() lanza NotFoundException si no existe', async () => {
    prisma.gato.findUnique.mockResolvedValue(null);
    await expect(controller.gato(99)).rejects.toThrow(NotFoundException);
  });

  it('colonia() lanza NotFoundException si no existe', async () => {
    prisma.colonia.findUnique.mockResolvedValue(null);
    await expect(controller.colonia(99)).rejects.toThrow(NotFoundException);
  });

  it('gatos()/comederos()/asignaciones() filtran por coloniaId', async () => {
    prisma.gato.findMany.mockResolvedValue([]);
    prisma.comedero.findMany.mockResolvedValue([]);
    prisma.asignacionVoluntario.findMany.mockResolvedValue([]);

    await controller.gatos(1);
    await controller.comederos(1);
    await controller.asignaciones(1);

    expect(prisma.gato.findMany).toHaveBeenCalledWith({ where: { coloniaId: 1 } });
    expect(prisma.comedero.findMany).toHaveBeenCalledWith({ where: { coloniaId: 1 } });
    expect(prisma.asignacionVoluntario.findMany).toHaveBeenCalledWith({
      where: { coloniaId: 1 },
      include: { voluntario: true },
    });
  });

  it('coloniaCompleta() pide colonia + gatos con su historial + comederos con sus visitas + asignaciones con el voluntario, todo anidado', async () => {
    prisma.colonia.findUnique.mockResolvedValue({ id: 1, nombre: 'X' });
    await controller.coloniaCompleta(1);
    expect(prisma.colonia.findUnique).toHaveBeenCalledWith({
      where: { id: 1 },
      include: {
        gatos: { include: { registrosClinicos: true } },
        comederos: { include: { visitas: true } },
        asignaciones: { include: { voluntario: true } },
      },
    });
  });

  it('coloniaCompleta() lanza NotFoundException si no existe', async () => {
    prisma.colonia.findUnique.mockResolvedValue(null);
    await expect(controller.coloniaCompleta(99)).rejects.toThrow(NotFoundException);
  });

  it('coloniaCompletaMinima() pide solo los campos que GraphQL pediría en su selección mínima', async () => {
    prisma.colonia.findUnique.mockResolvedValue({ id: 1, nombre: 'X' });
    await controller.coloniaCompletaMinima(1);
    expect(prisma.colonia.findUnique).toHaveBeenCalledWith({
      where: { id: 1 },
      select: {
        id: true,
        nombre: true,
        gatos: { select: { id: true, coloniaId: true, nombre: true, estadoCer: true, fotoUrl: true } },
        comederos: { select: { id: true, coloniaId: true, ubicacionDetallada: true } },
        asignaciones: { select: { voluntarioId: true, coloniaId: true, rolAsignado: true } },
      },
    });
  });

  it('coloniaCompletaMinima() lanza NotFoundException si no existe', async () => {
    prisma.colonia.findUnique.mockResolvedValue(null);
    await expect(controller.coloniaCompletaMinima(99)).rejects.toThrow(NotFoundException);
  });
});
