import { NotFoundException } from '@nestjs/common';
import { GatosService } from './gatos.service.js';
import { deleteUploadedFile } from '../uploads/uploaded-file.util.js';
import type { PrismaService } from '../prisma/prisma.service.js';

vi.mock('../uploads/uploaded-file.util.js', () => ({ deleteUploadedFile: vi.fn() }));

function createPrismaMock() {
  return {
    gato: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  };
}

describe('GatosService', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let service: GatosService;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new GatosService(prisma as unknown as PrismaService);
    vi.mocked(deleteUploadedFile).mockClear();
  });

  it('create() delega en prisma.gato.create', async () => {
    const data = { coloniaId: 1, sexo: 'MACHO', capaPelaje: 'Atigrado', estadoCer: 'AVISTADO' };
    prisma.gato.create.mockResolvedValue({ id: '1', ...data });

    const result = await service.create(data as never);

    expect(prisma.gato.create).toHaveBeenCalledWith({ data });
    expect(result).toEqual({ id: '1', ...data });
  });

  it('findAll() delega en prisma.gato.findMany', async () => {
    prisma.gato.findMany.mockResolvedValue([{ id: '1' }]);
    expect(await service.findAll()).toEqual([{ id: '1' }]);
  });

  it('findOne() devuelve el gato cuando existe', async () => {
    prisma.gato.findUnique.mockResolvedValue({ id: '1' });
    expect(await service.findOne('1')).toEqual({ id: '1' });
    expect(prisma.gato.findUnique).toHaveBeenCalledWith({ where: { id: 1 } });
  });

  it('findOne() lanza NotFoundException cuando no existe', async () => {
    prisma.gato.findUnique.mockResolvedValue(null);
    await expect(service.findOne('inexistente')).rejects.toThrow(NotFoundException);
  });

  it('update() comprueba que existe antes de actualizar', async () => {
    prisma.gato.findUnique.mockResolvedValue({ id: '1' });
    prisma.gato.update.mockResolvedValue({ id: '1', nombre: 'Michi' });

    const result = await service.update('1', { nombre: 'Michi' } as never);

    expect(prisma.gato.update).toHaveBeenCalledWith({ where: { id: 1 }, data: { nombre: 'Michi' } });
    expect(result).toEqual({ id: '1', nombre: 'Michi' });
  });

  it('update() propaga el NotFoundException sin llegar a llamar a update()', async () => {
    prisma.gato.findUnique.mockResolvedValue(null);
    await expect(service.update('inexistente', {} as never)).rejects.toThrow(NotFoundException);
    expect(prisma.gato.update).not.toHaveBeenCalled();
  });

  it('update() borra la foto anterior cuando se reemplaza por una nueva', async () => {
    prisma.gato.findUnique.mockResolvedValue({ id: '1', fotoUrl: 'http://x/uploads/vieja.webp' });
    prisma.gato.update.mockResolvedValue({ id: '1', fotoUrl: 'http://x/uploads/nueva.webp' });

    await service.update('1', { fotoUrl: 'http://x/uploads/nueva.webp' } as never);

    expect(deleteUploadedFile).toHaveBeenCalledWith('http://x/uploads/vieja.webp');
  });

  it('update() no borra nada si el campo fotoUrl ni se envía', async () => {
    prisma.gato.findUnique.mockResolvedValue({ id: '1', fotoUrl: 'http://x/uploads/vieja.webp' });
    prisma.gato.update.mockResolvedValue({ id: '1', nombre: 'Michi' });

    await service.update('1', { nombre: 'Michi' } as never);

    expect(deleteUploadedFile).not.toHaveBeenCalled();
  });

  it('remove() comprueba que existe antes de borrar', async () => {
    prisma.gato.findUnique.mockResolvedValue({ id: '1' });
    prisma.gato.delete.mockResolvedValue({ id: '1' });

    expect(await service.remove('1')).toEqual({ id: '1' });
    expect(prisma.gato.delete).toHaveBeenCalledWith({ where: { id: 1 } });
  });

  it('remove() propaga el NotFoundException sin llegar a llamar a delete()', async () => {
    prisma.gato.findUnique.mockResolvedValue(null);
    await expect(service.remove('inexistente')).rejects.toThrow(NotFoundException);
    expect(prisma.gato.delete).not.toHaveBeenCalled();
  });

  it('remove() borra la foto del gato eliminado', async () => {
    prisma.gato.findUnique.mockResolvedValue({ id: '1' });
    prisma.gato.delete.mockResolvedValue({ id: '1', fotoUrl: 'http://x/uploads/borrada.webp' });

    await service.remove('1');

    expect(deleteUploadedFile).toHaveBeenCalledWith('http://x/uploads/borrada.webp');
  });
});
