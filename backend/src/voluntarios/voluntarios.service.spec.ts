import { NotFoundException } from '@nestjs/common';
import { VoluntariosService } from './voluntarios.service.js';
import { runWithTenantContext } from '../prisma/tenant-context.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { MediaService } from '../storage/media.service.js';

function createPrismaMock() {
  return {
    voluntario: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  };
}

function createMediaMock() {
  return { eliminar: vi.fn() };
}

describe('VoluntariosService', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let media: ReturnType<typeof createMediaMock>;
  let service: VoluntariosService;

  beforeEach(() => {
    prisma = createPrismaMock();
    media = createMediaMock();
    service = new VoluntariosService(prisma as unknown as PrismaService, media as unknown as MediaService);
  });

  it('create() delega en prisma.voluntario.create, con el organizacionId de la sesión', async () => {
    const data = { dni: '12345678Z', nombre: 'Ana' };
    prisma.voluntario.create.mockResolvedValue({ id: '1', ...data });

    const result = await runWithTenantContext({ organizacionId: 7, isSuperadmin: false }, () =>
      service.create(data as never),
    );

    expect(prisma.voluntario.create).toHaveBeenCalledWith({ data: { ...data, organizacionId: 7 } });
    expect(result).toEqual({ id: '1', ...data });
  });

  it('findAll() delega en prisma.voluntario.findMany', async () => {
    prisma.voluntario.findMany.mockResolvedValue([{ id: '1' }]);
    expect(await service.findAll()).toEqual([{ id: '1' }]);
  });

  it('findOne() devuelve el voluntario cuando existe', async () => {
    prisma.voluntario.findUnique.mockResolvedValue({ id: '1' });
    expect(await service.findOne('1')).toEqual({ id: '1' });
    expect(prisma.voluntario.findUnique).toHaveBeenCalledWith({ where: { id: 1 } });
  });

  it('findOne() lanza NotFoundException cuando no existe', async () => {
    prisma.voluntario.findUnique.mockResolvedValue(null);
    await expect(service.findOne('inexistente')).rejects.toThrow(NotFoundException);
  });

  it('update() comprueba que existe antes de actualizar', async () => {
    prisma.voluntario.findUnique.mockResolvedValue({ id: '1' });
    prisma.voluntario.update.mockResolvedValue({ id: '1', nombre: 'Nuevo' });

    const result = await service.update('1', { nombre: 'Nuevo' } as never);

    expect(prisma.voluntario.update).toHaveBeenCalledWith({ where: { id: 1 }, data: { nombre: 'Nuevo' } });
    expect(result).toEqual({ id: '1', nombre: 'Nuevo' });
  });

  it('update() propaga el NotFoundException sin llegar a llamar a update()', async () => {
    prisma.voluntario.findUnique.mockResolvedValue(null);
    await expect(service.update('inexistente', {} as never)).rejects.toThrow(NotFoundException);
    expect(prisma.voluntario.update).not.toHaveBeenCalled();
  });

  it('update() borra el documento anterior cuando se reemplaza por uno nuevo', async () => {
    prisma.voluntario.findUnique.mockResolvedValue({ id: '1', urlCesionDatos: 'http://x/uploads/vieja.webp' });
    prisma.voluntario.update.mockResolvedValue({ id: '1', urlCesionDatos: 'http://x/uploads/nueva.webp' });

    await service.update('1', { urlCesionDatos: 'http://x/uploads/nueva.webp' } as never);

    expect(media.eliminar).toHaveBeenCalledWith('http://x/uploads/vieja.webp');
  });

  it('update() no borra nada si el campo urlCesionDatos ni se envía', async () => {
    prisma.voluntario.findUnique.mockResolvedValue({ id: '1', urlCesionDatos: 'http://x/uploads/vieja.webp' });
    prisma.voluntario.update.mockResolvedValue({ id: '1', nombre: 'Nuevo' });

    await service.update('1', { nombre: 'Nuevo' } as never);

    expect(media.eliminar).not.toHaveBeenCalled();
  });

  it('remove() comprueba que existe antes de borrar', async () => {
    prisma.voluntario.findUnique.mockResolvedValue({ id: '1' });
    prisma.voluntario.delete.mockResolvedValue({ id: '1' });

    expect(await service.remove('1')).toEqual({ id: '1' });
    expect(prisma.voluntario.delete).toHaveBeenCalledWith({ where: { id: 1 } });
  });

  it('remove() propaga el NotFoundException sin llegar a llamar a delete()', async () => {
    prisma.voluntario.findUnique.mockResolvedValue(null);
    await expect(service.remove('inexistente')).rejects.toThrow(NotFoundException);
    expect(prisma.voluntario.delete).not.toHaveBeenCalled();
  });

  it('remove() borra el documento del voluntario eliminado', async () => {
    prisma.voluntario.findUnique.mockResolvedValue({ id: '1' });
    prisma.voluntario.delete.mockResolvedValue({ id: '1', urlCesionDatos: 'http://x/uploads/borrada.webp' });

    await service.remove('1');

    expect(media.eliminar).toHaveBeenCalledWith('http://x/uploads/borrada.webp');
  });
});
