import { NotFoundException } from '@nestjs/common';
import { ComederosService } from './comederos.service.js';
import { deleteUploadedFile } from '../uploads/uploaded-file.util.js';
import type { PrismaService } from '../prisma/prisma.service.js';

vi.mock('../uploads/uploaded-file.util.js', () => ({ deleteUploadedFile: vi.fn() }));

function createPrismaMock() {
  return {
    comedero: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  };
}

describe('ComederosService', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let service: ComederosService;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new ComederosService(prisma as unknown as PrismaService);
    vi.mocked(deleteUploadedFile).mockClear();
  });

  it('create() delega en prisma.comedero.create', async () => {
    const data = { coloniaId: 1, ubicacionDetallada: 'junto al banco' };
    prisma.comedero.create.mockResolvedValue({ id: '1', ...data });

    const result = await service.create(data as never);

    expect(prisma.comedero.create).toHaveBeenCalledWith({ data });
    expect(result).toEqual({ id: '1', ...data });
  });

  it('findAll() delega en prisma.comedero.findMany', async () => {
    prisma.comedero.findMany.mockResolvedValue([{ id: '1' }]);
    expect(await service.findAll()).toEqual([{ id: '1' }]);
  });

  it('findOne() devuelve el comedero cuando existe', async () => {
    prisma.comedero.findUnique.mockResolvedValue({ id: '1' });
    expect(await service.findOne('1')).toEqual({ id: '1' });
    expect(prisma.comedero.findUnique).toHaveBeenCalledWith({ where: { id: 1 } });
  });

  it('findOne() lanza NotFoundException cuando no existe', async () => {
    prisma.comedero.findUnique.mockResolvedValue(null);
    await expect(service.findOne('inexistente')).rejects.toThrow(NotFoundException);
  });

  it('update() comprueba que existe antes de actualizar', async () => {
    prisma.comedero.findUnique.mockResolvedValue({ id: '1' });
    prisma.comedero.update.mockResolvedValue({ id: '1', ubicacionDetallada: 'nueva' });

    const result = await service.update('1', { ubicacionDetallada: 'nueva' } as never);

    expect(prisma.comedero.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { ubicacionDetallada: 'nueva' },
    });
    expect(result).toEqual({ id: '1', ubicacionDetallada: 'nueva' });
  });

  it('update() propaga el NotFoundException sin llegar a llamar a update()', async () => {
    prisma.comedero.findUnique.mockResolvedValue(null);
    await expect(service.update('inexistente', {} as never)).rejects.toThrow(NotFoundException);
    expect(prisma.comedero.update).not.toHaveBeenCalled();
  });

  it('update() borra la foto anterior cuando se reemplaza por una nueva', async () => {
    prisma.comedero.findUnique.mockResolvedValue({ id: '1', fotoUrl: 'http://x/uploads/vieja.webp' });
    prisma.comedero.update.mockResolvedValue({ id: '1', fotoUrl: 'http://x/uploads/nueva.webp' });

    await service.update('1', { fotoUrl: 'http://x/uploads/nueva.webp' } as never);

    expect(deleteUploadedFile).toHaveBeenCalledWith('http://x/uploads/vieja.webp');
  });

  it('update() no borra nada si el campo fotoUrl ni se envía', async () => {
    prisma.comedero.findUnique.mockResolvedValue({ id: '1', fotoUrl: 'http://x/uploads/vieja.webp' });
    prisma.comedero.update.mockResolvedValue({ id: '1', ubicacionDetallada: 'nueva' });

    await service.update('1', { ubicacionDetallada: 'nueva' } as never);

    expect(deleteUploadedFile).not.toHaveBeenCalled();
  });

  it('remove() comprueba que existe antes de borrar', async () => {
    prisma.comedero.findUnique.mockResolvedValue({ id: '1' });
    prisma.comedero.delete.mockResolvedValue({ id: '1' });

    expect(await service.remove('1')).toEqual({ id: '1' });
    expect(prisma.comedero.delete).toHaveBeenCalledWith({ where: { id: 1 } });
  });

  it('remove() propaga el NotFoundException sin llegar a llamar a delete()', async () => {
    prisma.comedero.findUnique.mockResolvedValue(null);
    await expect(service.remove('inexistente')).rejects.toThrow(NotFoundException);
    expect(prisma.comedero.delete).not.toHaveBeenCalled();
  });

  it('remove() borra la foto del comedero eliminado', async () => {
    prisma.comedero.findUnique.mockResolvedValue({ id: '1' });
    prisma.comedero.delete.mockResolvedValue({ id: '1', fotoUrl: 'http://x/uploads/borrada.webp' });

    await service.remove('1');

    expect(deleteUploadedFile).toHaveBeenCalledWith('http://x/uploads/borrada.webp');
  });
});
