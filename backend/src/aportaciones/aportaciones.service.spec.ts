import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { AportacionesService } from './aportaciones.service.js';
import { runWithTenantContext } from '../prisma/tenant-context.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { UsuariosService } from '../usuarios/usuarios.service.js';
import type { AportacionFilterService } from './aportacion-filter.service.js';

const conParticular = <T>(fn: () => T) =>
  runWithTenantContext(
    { organizacionId: 3, isSuperadmin: false, usuarioId: 7, rol: 'PARTICULAR' as never },
    fn,
  );

const conAdministrador = <T>(fn: () => T) =>
  runWithTenantContext(
    { organizacionId: 3, isSuperadmin: false, usuarioId: 1, rol: 'ADMINISTRADOR' as never },
    fn,
  );

function createPrismaMock() {
  const tx = {
    aportacionColonia: { create: vi.fn(), update: vi.fn() },
    aportacionGato: { updateMany: vi.fn(), update: vi.fn() },
    colonia: { create: vi.fn() },
    gato: { create: vi.fn() },
    // runTenantTransaction (tenant-context.ts) hace SET LOCAL en tx antes de llamar a la propia
    // transacción - solo se invoca de verdad si el test corre dentro de conParticular/conAdministrador.
    $executeRawUnsafe: vi.fn(),
  };
  return {
    $transaction: vi.fn((callback: (transaction: typeof tx) => unknown) => callback(tx)),
    aportacionColonia: { count: vi.fn(), findMany: vi.fn(), findUnique: vi.fn() },
    aportacionGato: { count: vi.fn() },
    tx,
  };
}

function createFilterMock() {
  return {
    evaluarRitmoEnvios: vi.fn().mockReturnValue({ aceptado: true }),
    evaluarCoordenadas: vi.fn().mockReturnValue({ aceptado: true }),
    evaluarTextos: vi.fn().mockReturnValue({ aceptado: true }),
  };
}

const dataColonia = () => ({
  nombre: 'Colonia del parque',
  tipoSuelo: 'URBANO' as const,
  latitud: 40.4168,
  longitud: -3.7038,
  observaciones: undefined,
  fotoUrl: undefined,
  gatos: [{ sexo: 'MACHO' as const, capaPelaje: 'Negro', estadoCer: 'AVISTADO' as const }],
});

describe('AportacionesService', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let usuariosService: { findById: ReturnType<typeof vi.fn> };
  let filter: ReturnType<typeof createFilterMock>;
  let service: AportacionesService;

  beforeEach(() => {
    prisma = createPrismaMock();
    usuariosService = { findById: vi.fn().mockResolvedValue({ emailVerificado: true }) };
    filter = createFilterMock();
    prisma.aportacionColonia.count.mockResolvedValue(0);
    prisma.aportacionGato.count.mockResolvedValue(0);
    service = new AportacionesService(
      prisma as unknown as PrismaService,
      usuariosService as unknown as UsuariosService,
      filter as unknown as AportacionFilterService,
    );
  });

  describe('crearColonia', () => {
    it('crea la aportación en PENDIENTE_MANUAL cuando el filtro la acepta', async () => {
      prisma.tx.aportacionColonia.create.mockResolvedValue({ id: 1, estado: 'PENDIENTE_MANUAL' });

      await conParticular(() => service.crearColonia(dataColonia() as never));

      expect(prisma.tx.aportacionColonia.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            organizacionId: 3,
            usuarioId: 7,
            estado: 'PENDIENTE_MANUAL',
            motivoRechazo: undefined,
          }),
        }),
      );
    });

    it('crea la aportación en RECHAZADA_AUTOMATICA con el motivo cuando el filtro de texto la rechaza', async () => {
      filter.evaluarTextos.mockReturnValue({ aceptado: false, motivo: 'contenido no permitido' });
      prisma.tx.aportacionColonia.create.mockResolvedValue({ id: 1, estado: 'RECHAZADA_AUTOMATICA' });

      await conParticular(() => service.crearColonia(dataColonia() as never));

      expect(prisma.tx.aportacionColonia.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            estado: 'RECHAZADA_AUTOMATICA',
            motivoRechazo: 'contenido no permitido',
          }),
        }),
      );
    });

    it('rechaza sin tocar la base de datos si el email no está verificado', async () => {
      usuariosService.findById.mockResolvedValue({ emailVerificado: false });

      await expect(conParticular(() => service.crearColonia(dataColonia() as never))).rejects.toThrow(
        ForbiddenException,
      );
      expect(prisma.aportacionColonia.count).not.toHaveBeenCalled();
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('rechaza al alcanzar el máximo de colonias aportadas por cuenta', async () => {
      prisma.aportacionColonia.count.mockResolvedValueOnce(3); // cupo de colonias ya al máximo

      await expect(conParticular(() => service.crearColonia(dataColonia() as never))).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('rechaza al superar el máximo de gatos aportados por cuenta (existentes + nuevos)', async () => {
      prisma.aportacionGato.count.mockResolvedValueOnce(20); // ya en el máximo, cualquier gato nuevo lo supera

      await expect(conParticular(() => service.crearColonia(dataColonia() as never))).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('misAportaciones / aportacionesPendientes', () => {
    it('misAportaciones no añade ningún where explícito - RLS ya filtra por usuario_id', async () => {
      prisma.aportacionColonia.findMany.mockResolvedValue([]);
      await service.misAportaciones();
      expect(prisma.aportacionColonia.findMany).toHaveBeenCalledWith(
        expect.not.objectContaining({ where: expect.anything() }),
      );
    });

    it('aportacionesPendientes filtra por estado PENDIENTE_MANUAL', async () => {
      prisma.aportacionColonia.findMany.mockResolvedValue([]);
      await service.aportacionesPendientes();
      expect(prisma.aportacionColonia.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { estado: 'PENDIENTE_MANUAL' } }),
      );
    });
  });

  describe('revisar', () => {
    it('lanza NotFoundException si la aportación no existe', async () => {
      prisma.aportacionColonia.findUnique.mockResolvedValue(null);
      await expect(service.revisar({ id: 999, aceptar: true } as never)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('lanza BadRequestException si la aportación ya fue revisada', async () => {
      prisma.aportacionColonia.findUnique.mockResolvedValue({ id: 1, estado: 'ACEPTADA', gatos: [] });
      await expect(service.revisar({ id: 1, aceptar: true } as never)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rechazar marca la colonia y sus gatos como RECHAZADA_MANUAL con el motivo', async () => {
      prisma.aportacionColonia.findUnique.mockResolvedValue({
        id: 1,
        estado: 'PENDIENTE_MANUAL',
        gatos: [{ id: 10 }],
      });
      prisma.tx.aportacionColonia.update.mockResolvedValue({ id: 1, estado: 'RECHAZADA_MANUAL' });

      await conAdministrador(() =>
        service.revisar({ id: 1, aceptar: false, motivoRechazo: 'Datos no verificables' } as never),
      );

      expect(prisma.tx.aportacionGato.updateMany).toHaveBeenCalledWith({
        where: { aportacionColoniaId: 1 },
        data: { estado: 'RECHAZADA_MANUAL', motivoRechazo: 'Datos no verificables' },
      });
      expect(prisma.tx.aportacionColonia.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: { estado: 'RECHAZADA_MANUAL', motivoRechazo: 'Datos no verificables' },
        }),
      );
      expect(prisma.tx.colonia.create).not.toHaveBeenCalled();
    });

    it('aceptar crea la Colonia y los Gatos reales y marca la aportación como ACEPTADA', async () => {
      prisma.aportacionColonia.findUnique.mockResolvedValue({
        id: 1,
        estado: 'PENDIENTE_MANUAL',
        nombre: 'Colonia del parque',
        tipoSuelo: 'URBANO',
        latitud: 40.4,
        longitud: -3.7,
        observaciones: null,
        fotoUrl: null,
        gatos: [
          {
            id: 10,
            nombre: 'Michi',
            sexo: 'MACHO',
            capaPelaje: 'Negro',
            estadoCer: 'AVISTADO',
            observaciones: null,
            fotoUrl: null,
          },
        ],
      });
      prisma.tx.colonia.create.mockResolvedValue({ id: 55 });
      prisma.tx.gato.create.mockResolvedValue({ id: 66 });
      prisma.tx.aportacionColonia.update.mockResolvedValue({ id: 1, estado: 'ACEPTADA' });

      await conAdministrador(() => service.revisar({ id: 1, aceptar: true } as never));

      expect(prisma.tx.colonia.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ organizacionId: 3, nombre: 'Colonia del parque' }),
      });
      expect(prisma.tx.gato.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ organizacionId: 3, coloniaId: 55, nombre: 'Michi' }),
      });
      expect(prisma.tx.aportacionGato.update).toHaveBeenCalledWith({
        where: { id: 10 },
        data: { estado: 'ACEPTADA', gatoCreadoId: 66 },
      });
      expect(prisma.tx.aportacionColonia.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { estado: 'ACEPTADA', coloniaCreadaId: 55 },
        include: { gatos: true },
      });
    });
  });
});
