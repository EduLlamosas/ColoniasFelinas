import { NotFoundException } from '@nestjs/common';
import { ColoniasService } from './colonias.service.js';
import { deleteUploadedFile } from '../uploads/uploaded-file.util.js';
import type { PrismaService } from '../prisma/prisma.service.js';

vi.mock('../uploads/uploaded-file.util.js', () => ({ deleteUploadedFile: vi.fn() }));

function createPrismaMock() {
  return {
    colonia: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  };
}

describe('ColoniasService', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let service: ColoniasService;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new ColoniasService(prisma as unknown as PrismaService);
    vi.mocked(deleteUploadedFile).mockClear();
  });

  it('create() delega en prisma.colonia.create', async () => {
    const data = { codigoOficial: 'COL-1', nombre: 'X', tipoSuelo: 'URBANO', latitud: 1, longitud: 1 };
    prisma.colonia.create.mockResolvedValue({ id: '1', ...data });

    const result = await service.create(data as never);

    expect(prisma.colonia.create).toHaveBeenCalledWith({ data });
    expect(result).toEqual({ id: '1', ...data });
  });

  it('findAll() delega en prisma.colonia.findMany', async () => {
    prisma.colonia.findMany.mockResolvedValue([{ id: '1' }]);
    const result = await service.findAll();
    expect(result).toEqual([{ id: '1' }]);
  });

  it('findOne() devuelve la colonia cuando existe', async () => {
    prisma.colonia.findUnique.mockResolvedValue({ id: '1', nombre: 'X' });
    const result = await service.findOne('1');
    expect(prisma.colonia.findUnique).toHaveBeenCalledWith({ where: { id: 1 } });
    expect(result).toEqual({ id: '1', nombre: 'X' });
  });

  it('findOne() lanza NotFoundException cuando no existe', async () => {
    prisma.colonia.findUnique.mockResolvedValue(null);
    await expect(service.findOne('inexistente')).rejects.toThrow(NotFoundException);
  });

  it('update() comprueba que existe antes de actualizar', async () => {
    prisma.colonia.findUnique.mockResolvedValue({ id: '1' });
    prisma.colonia.update.mockResolvedValue({ id: '1', nombre: 'Nuevo' });

    const result = await service.update('1', { nombre: 'Nuevo' } as never);

    expect(prisma.colonia.update).toHaveBeenCalledWith({ where: { id: 1 }, data: { nombre: 'Nuevo' } });
    expect(result).toEqual({ id: '1', nombre: 'Nuevo' });
  });

  it('update() propaga el NotFoundException sin llegar a llamar a update()', async () => {
    prisma.colonia.findUnique.mockResolvedValue(null);
    await expect(service.update('inexistente', {} as never)).rejects.toThrow(NotFoundException);
    expect(prisma.colonia.update).not.toHaveBeenCalled();
  });

  it('update() borra la foto anterior cuando se reemplaza por una nueva', async () => {
    prisma.colonia.findUnique.mockResolvedValue({ id: '1', fotoUrl: 'http://x/uploads/vieja.webp' });
    prisma.colonia.update.mockResolvedValue({ id: '1', fotoUrl: 'http://x/uploads/nueva.webp' });

    await service.update('1', { fotoUrl: 'http://x/uploads/nueva.webp' } as never);

    expect(deleteUploadedFile).toHaveBeenCalledWith('http://x/uploads/vieja.webp');
  });

  it('update() borra la foto anterior cuando se limpia el campo (null)', async () => {
    prisma.colonia.findUnique.mockResolvedValue({ id: '1', fotoUrl: 'http://x/uploads/vieja.webp' });
    prisma.colonia.update.mockResolvedValue({ id: '1', fotoUrl: null });

    await service.update('1', { fotoUrl: null } as never);

    expect(deleteUploadedFile).toHaveBeenCalledWith('http://x/uploads/vieja.webp');
  });

  it('update() no borra nada si el campo fotoUrl ni se envía', async () => {
    prisma.colonia.findUnique.mockResolvedValue({ id: '1', fotoUrl: 'http://x/uploads/vieja.webp' });
    prisma.colonia.update.mockResolvedValue({ id: '1', nombre: 'Nuevo', fotoUrl: 'http://x/uploads/vieja.webp' });

    await service.update('1', { nombre: 'Nuevo' } as never);

    expect(deleteUploadedFile).not.toHaveBeenCalled();
  });

  it('remove() comprueba que existe antes de borrar', async () => {
    prisma.colonia.findUnique.mockResolvedValue({ id: '1' });
    prisma.colonia.delete.mockResolvedValue({ id: '1' });

    const result = await service.remove('1');

    expect(prisma.colonia.delete).toHaveBeenCalledWith({ where: { id: 1 } });
    expect(result).toEqual({ id: '1' });
  });

  it('remove() propaga el NotFoundException sin llegar a llamar a delete()', async () => {
    prisma.colonia.findUnique.mockResolvedValue(null);
    await expect(service.remove('inexistente')).rejects.toThrow(NotFoundException);
    expect(prisma.colonia.delete).not.toHaveBeenCalled();
  });

  it('remove() borra la foto de la colonia eliminada', async () => {
    prisma.colonia.findUnique.mockResolvedValue({ id: '1' });
    prisma.colonia.delete.mockResolvedValue({ id: '1', fotoUrl: 'http://x/uploads/borrada.webp' });

    await service.remove('1');

    expect(deleteUploadedFile).toHaveBeenCalledWith('http://x/uploads/borrada.webp');
  });
});
