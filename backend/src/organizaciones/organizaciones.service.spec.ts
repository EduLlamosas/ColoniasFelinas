vi.mock('bcrypt', () => ({
  hash: vi.fn(),
  compare: vi.fn(),
}));

import { BadRequestException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { OrganizacionesService } from './organizaciones.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { EmailService } from '../email/email.service.js';

function createPrismaMock() {
  const tx = {
    organizacion: { create: vi.fn() },
    usuario: { create: vi.fn() },
    solicitudOrganizacion: { update: vi.fn() },
    // runTenantTransaction (tenant-context.ts) hace SET LOCAL en tx antes de llamar a la propia
    // transacción - runAsSuperadmin ya deja un contexto activo, así que siempre se invoca de verdad.
    $executeRawUnsafe: vi.fn(),
  };
  return {
    $transaction: vi.fn((callback: (transaction: typeof tx) => unknown) => callback(tx)),
    organizacion: { findMany: vi.fn() },
    solicitudOrganizacion: { findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    tx,
  };
}

describe('OrganizacionesService', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let email: { enviar: ReturnType<typeof vi.fn> };
  let service: OrganizacionesService;

  beforeEach(() => {
    vi.clearAllMocks();
    prisma = createPrismaMock();
    email = { enviar: vi.fn().mockResolvedValue(undefined) };
    vi.mocked(bcrypt.hash).mockResolvedValue('hash-simulado' as never);
    service = new OrganizacionesService(prisma as unknown as PrismaService, email as unknown as EmailService);
  });

  describe('crear', () => {
    it('crea la Organizacion y su primer ADMINISTRADOR en la misma transacción', async () => {
      prisma.tx.organizacion.create.mockResolvedValue({ id: 5, nombre: 'Ayto', slug: 'ayto' });
      prisma.tx.usuario.create.mockResolvedValue({ id: 1, email: 'admin@ayto.es' });

      const result = await service.crear({
        nombre: 'Ayto',
        slug: 'ayto',
        adminEmail: 'admin@ayto.es',
        adminNombre: 'Ana',
      } as never);

      expect(prisma.tx.organizacion.create).toHaveBeenCalledWith({ data: { nombre: 'Ayto', slug: 'ayto' } });
      expect(prisma.tx.usuario.create).toHaveBeenCalledWith({
        data: {
          email: 'admin@ayto.es',
          passwordHash: 'hash-simulado',
          nombreCompleto: 'Ana',
          rol: 'ADMINISTRADOR',
          organizacionId: 5,
        },
      });
      expect(result.organizacion).toEqual({ id: 5, nombre: 'Ayto', slug: 'ayto' });
      expect(typeof result.adminPasswordTemporal).toBe('string');
      expect(result.adminPasswordTemporal.length).toBeGreaterThan(0);
    });
  });

  describe('solicitudes', () => {
    it('sin filtro devuelve todas ordenadas por fecha descendente', async () => {
      prisma.solicitudOrganizacion.findMany.mockResolvedValue([]);
      await service.solicitudes();
      expect(prisma.solicitudOrganizacion.findMany).toHaveBeenCalledWith({
        where: undefined,
        orderBy: { createdAt: 'desc' },
      });
    });

    it('con estado filtra por ese estado', async () => {
      prisma.solicitudOrganizacion.findMany.mockResolvedValue([]);
      await service.solicitudes('PENDIENTE' as never);
      expect(prisma.solicitudOrganizacion.findMany).toHaveBeenCalledWith({
        where: { estado: 'PENDIENTE' },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('aprobarSolicitud', () => {
    const solicitudPendiente = {
      id: 1,
      nombre: 'Ayto Y',
      slug: 'ayto-y',
      contactoNombre: 'Bea',
      contactoEmail: 'bea@y.es',
      estado: 'PENDIENTE',
    };

    it('crea la Organizacion + admin, marca la solicitud como APROBADA y manda la contraseña por email', async () => {
      prisma.solicitudOrganizacion.findUnique.mockResolvedValue(solicitudPendiente);
      prisma.tx.organizacion.create.mockResolvedValue({ id: 8, nombre: 'Ayto Y', slug: 'ayto-y' });
      prisma.tx.usuario.create.mockResolvedValue({ id: 2, email: 'bea@y.es' });

      const result = await service.aprobarSolicitud(1);

      expect(prisma.tx.usuario.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ email: 'bea@y.es', rol: 'ADMINISTRADOR', organizacionId: 8 }),
        }),
      );
      expect(prisma.tx.solicitudOrganizacion.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { estado: 'APROBADA', organizacionCreadaId: 8 },
      });
      expect(email.enviar).toHaveBeenCalledWith(
        'bea@y.es',
        expect.any(String),
        expect.stringContaining('bea@y.es'),
      );
      expect(result).toEqual({ id: 8, nombre: 'Ayto Y', slug: 'ayto-y' });
    });

    it('lanza NotFoundException si la solicitud no existe', async () => {
      prisma.solicitudOrganizacion.findUnique.mockResolvedValue(null);
      await expect(service.aprobarSolicitud(999)).rejects.toThrow(NotFoundException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('lanza BadRequestException si la solicitud ya fue resuelta', async () => {
      prisma.solicitudOrganizacion.findUnique.mockResolvedValue({ ...solicitudPendiente, estado: 'APROBADA' });
      await expect(service.aprobarSolicitud(1)).rejects.toThrow(BadRequestException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('rechazarSolicitud', () => {
    const solicitudPendiente = {
      id: 2,
      nombre: 'Ayto Z',
      slug: 'ayto-z',
      contactoNombre: 'Carlos',
      contactoEmail: 'carlos@z.es',
      estado: 'PENDIENTE',
    };

    it('marca la solicitud como RECHAZADA y manda el motivo por email', async () => {
      prisma.solicitudOrganizacion.findUnique.mockResolvedValue(solicitudPendiente);

      const result = await service.rechazarSolicitud(2, 'Datos insuficientes');

      expect(prisma.solicitudOrganizacion.update).toHaveBeenCalledWith({
        where: { id: 2 },
        data: { estado: 'RECHAZADA' },
      });
      expect(email.enviar).toHaveBeenCalledWith(
        'carlos@z.es',
        expect.any(String),
        expect.stringContaining('Datos insuficientes'),
      );
      expect(result).toBe(true);
    });

    it('lanza BadRequestException si la solicitud ya fue resuelta', async () => {
      prisma.solicitudOrganizacion.findUnique.mockResolvedValue({ ...solicitudPendiente, estado: 'RECHAZADA' });
      await expect(service.rechazarSolicitud(2)).rejects.toThrow(BadRequestException);
      expect(prisma.solicitudOrganizacion.update).not.toHaveBeenCalled();
    });
  });
});
