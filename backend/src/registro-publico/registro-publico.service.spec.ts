vi.mock('bcrypt', () => ({
  hash: vi.fn(),
  compare: vi.fn(),
}));

import { BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { RegistroPublicoService } from './registro-publico.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { EmailService } from '../email/email.service.js';

function createPrismaMock() {
  return {
    organizacion: { findMany: vi.fn(), findUnique: vi.fn() },
    solicitudOrganizacion: { create: vi.fn() },
    usuario: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
  };
}

describe('RegistroPublicoService', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let email: { enviar: ReturnType<typeof vi.fn> };
  let service: RegistroPublicoService;

  beforeEach(() => {
    vi.clearAllMocks();
    prisma = createPrismaMock();
    email = { enviar: vi.fn().mockResolvedValue(undefined) };
    service = new RegistroPublicoService(prisma as unknown as PrismaService, email as unknown as EmailService);
  });

  it('organizacionesPublicas() solo pide organizaciones activas, con campos mínimos', async () => {
    prisma.organizacion.findMany.mockResolvedValue([{ id: 1, nombre: 'Ayto', slug: 'ayto' }]);
    const result = await service.organizacionesPublicas();
    expect(prisma.organizacion.findMany).toHaveBeenCalledWith({
      where: { activo: true },
      select: { id: true, nombre: true, slug: true },
      orderBy: { nombre: 'asc' },
    });
    expect(result).toEqual([{ id: 1, nombre: 'Ayto', slug: 'ayto' }]);
  });

  it('solicitarOrganizacion() crea la solicitud con los datos tal cual', async () => {
    const data = {
      nombre: 'Ayuntamiento X',
      slug: 'ayuntamiento-x',
      contactoNombre: 'Ana',
      contactoEmail: 'ana@x.es',
    };
    prisma.solicitudOrganizacion.create.mockResolvedValue({ id: 1, ...data, estado: 'PENDIENTE' });

    await service.solicitarOrganizacion(data as never);

    expect(prisma.solicitudOrganizacion.create).toHaveBeenCalledWith({ data });
  });

  describe('registrarParticular', () => {
    const data = {
      email: 'particular@ejemplo.com',
      password: 'secreto123',
      nombreCompleto: 'Pepe',
      organizacionSlug: 'ayto',
    };

    it('crea el usuario PARTICULAR sin email verificado y manda el correo de verificación', async () => {
      prisma.organizacion.findUnique.mockResolvedValue({ id: 3, slug: 'ayto', activo: true });
      vi.mocked(bcrypt.hash).mockResolvedValue('hash-simulado' as never);
      prisma.usuario.create.mockResolvedValue({ id: 9, email: data.email, nombreCompleto: 'Pepe' });

      const result = await service.registrarParticular(data as never);

      expect(prisma.organizacion.findUnique).toHaveBeenCalledWith({ where: { slug: 'ayto' } });
      expect(prisma.usuario.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: data.email,
            passwordHash: 'hash-simulado',
            rol: 'PARTICULAR',
            organizacionId: 3,
            emailVerificado: false,
            tokenVerificacionEmail: expect.any(String),
            tokenVerificacionExpira: expect.any(Date),
          }),
        }),
      );

      const tokenUsado = prisma.usuario.create.mock.calls[0][0].data.tokenVerificacionEmail;
      expect(email.enviar).toHaveBeenCalledWith(
        data.email,
        expect.any(String),
        expect.stringContaining(tokenUsado),
      );
      expect(result).toEqual({ email: data.email, emailVerificacionEnviado: true });
    });

    it('rechaza si la organización no existe', async () => {
      prisma.organizacion.findUnique.mockResolvedValue(null);
      await expect(service.registrarParticular(data as never)).rejects.toThrow(BadRequestException);
      expect(prisma.usuario.create).not.toHaveBeenCalled();
      expect(email.enviar).not.toHaveBeenCalled();
    });

    it('rechaza si la organización existe pero no está activa', async () => {
      prisma.organizacion.findUnique.mockResolvedValue({ id: 3, slug: 'ayto', activo: false });
      await expect(service.registrarParticular(data as never)).rejects.toThrow(BadRequestException);
      expect(prisma.usuario.create).not.toHaveBeenCalled();
    });
  });

  describe('verificarEmail', () => {
    it('marca el email como verificado y limpia el token cuando es válido y no ha caducado', async () => {
      const enUnaHora = new Date(Date.now() + 60 * 60 * 1000);
      prisma.usuario.findUnique.mockResolvedValue({
        id: 9,
        tokenVerificacionEmail: 'token-valido',
        tokenVerificacionExpira: enUnaHora,
      });

      const result = await service.verificarEmail('token-valido');

      expect(result).toBe(true);
      expect(prisma.usuario.update).toHaveBeenCalledWith({
        where: { id: 9 },
        data: { emailVerificado: true, tokenVerificacionEmail: null, tokenVerificacionExpira: null },
      });
    });

    it('rechaza un token que no existe', async () => {
      prisma.usuario.findUnique.mockResolvedValue(null);
      await expect(service.verificarEmail('token-inexistente')).rejects.toThrow(BadRequestException);
      expect(prisma.usuario.update).not.toHaveBeenCalled();
    });

    it('rechaza un token caducado sin llegar a actualizar el usuario', async () => {
      const haceUnaHora = new Date(Date.now() - 60 * 60 * 1000);
      prisma.usuario.findUnique.mockResolvedValue({
        id: 9,
        tokenVerificacionEmail: 'token-caducado',
        tokenVerificacionExpira: haceUnaHora,
      });

      await expect(service.verificarEmail('token-caducado')).rejects.toThrow(BadRequestException);
      expect(prisma.usuario.update).not.toHaveBeenCalled();
    });
  });
});
