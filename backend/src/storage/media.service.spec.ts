import { MediaService, MAX_STORAGE_MB_POR_ORGANIZACION } from './media.service.js';
import { runWithTenantContext } from '../prisma/tenant-context.js';
import type { StorageService } from './storage.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';

function createStorageMock() {
  return { put: vi.fn(), remove: vi.fn() };
}

function createPrismaMock() {
  return { organizacion: { findUniqueOrThrow: vi.fn(), update: vi.fn().mockResolvedValue({}) } };
}

const conOrganizacion = <T>(fn: () => T) =>
  runWithTenantContext({ organizacionId: 7, isSuperadmin: false, usuarioId: null, rol: null }, fn);

describe('MediaService', () => {
  let storage: ReturnType<typeof createStorageMock>;
  let prisma: ReturnType<typeof createPrismaMock>;
  let service: MediaService;

  beforeEach(() => {
    storage = createStorageMock();
    prisma = createPrismaMock();
    service = new MediaService(storage as unknown as StorageService, prisma as unknown as PrismaService);
  });

  it('subir() sube al storage con la clave prefijada por organización y aumenta storageKbUsados', async () => {
    prisma.organizacion.findUniqueOrThrow.mockResolvedValue({ storageKbUsados: 100 });
    storage.put.mockResolvedValue('http://x/org-7/fotos/a.webp');
    const data = Buffer.alloc(2048); // exactos 2KB

    const url = await conOrganizacion(() => service.subir('fotos', 'webp', data, 'image/webp'));

    expect(url).toBe('http://x/org-7/fotos/a.webp');
    expect(storage.put).toHaveBeenCalledWith(
      expect.stringMatching(/^org-7\/fotos\/.+\.webp$/),
      data,
      'image/webp',
    );
    expect(prisma.organizacion.update).toHaveBeenCalledWith({
      where: { id: 7 },
      data: { storageKbUsados: { increment: 2 } },
    });
  });

  it('subir() lanza 507 si la organización ya agotó su cuota, sin llegar a subir nada', async () => {
    prisma.organizacion.findUniqueOrThrow.mockResolvedValue({
      storageKbUsados: MAX_STORAGE_MB_POR_ORGANIZACION * 1024,
    });
    const data = Buffer.alloc(1024);

    const promise = conOrganizacion(() => service.subir('fotos', 'webp', data, 'image/webp'));
    await expect(promise).rejects.toMatchObject({ status: 507 });
    expect(storage.put).not.toHaveBeenCalled();
    expect(prisma.organizacion.update).not.toHaveBeenCalled();
  });

  it('eliminar() descuenta storageKbUsados según los bytes que el storage dice haber liberado', async () => {
    storage.remove.mockResolvedValue(3072); // 3KB
    await conOrganizacion(() => service.eliminar('http://x/org-7/fotos/a.webp'));
    expect(prisma.organizacion.update).toHaveBeenCalledWith({
      where: { id: 7 },
      data: { storageKbUsados: { decrement: 3 } },
    });
  });

  it('eliminar() no toca la cuota si el storage no borró nada de verdad (0 bytes liberados)', async () => {
    storage.remove.mockResolvedValue(0);
    await conOrganizacion(() => service.eliminar('http://x/no-existe.webp'));
    expect(prisma.organizacion.update).not.toHaveBeenCalled();
  });

  it('eliminar() con url null/undefined no hace nada', async () => {
    await conOrganizacion(() => service.eliminar(null));
    expect(storage.remove).not.toHaveBeenCalled();
    expect(prisma.organizacion.update).not.toHaveBeenCalled();
  });
});
