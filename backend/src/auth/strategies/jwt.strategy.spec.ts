import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from './jwt.strategy.js';
import type { ConfigService } from '@nestjs/config';
import type { UsuariosService } from '../../usuarios/usuarios.service.js';

function createConfigMock() {
  return { getOrThrow: vi.fn().mockReturnValue('un-secreto-cualquiera') } as unknown as ConfigService;
}

function createUsuariosServiceMock() {
  return { findById: vi.fn() };
}

describe('JwtStrategy', () => {
  let usuariosService: ReturnType<typeof createUsuariosServiceMock>;
  let strategy: JwtStrategy;

  beforeEach(() => {
    usuariosService = createUsuariosServiceMock();
    strategy = new JwtStrategy(createConfigMock(), usuariosService as unknown as UsuariosService);
  });

  it('acepta el payload cuando tokenVersion coincide con la del usuario en BD', async () => {
    usuariosService.findById.mockResolvedValue({ id: 1, tokenVersion: 2 });
    const payload = { sub: 1, email: 'a@b.com', rol: 'GESTOR' as const, tokenVersion: 2 };

    await expect(strategy.validate(payload)).resolves.toEqual(payload);
  });

  it('rechaza el payload si tokenVersion no coincide (sesión revocada tras un UPDATE)', async () => {
    usuariosService.findById.mockResolvedValue({ id: 1, tokenVersion: 3 });
    const payload = { sub: 1, email: 'a@b.com', rol: 'GESTOR' as const, tokenVersion: 2 };

    await expect(strategy.validate(payload)).rejects.toThrow(UnauthorizedException);
  });

  it('rechaza el payload si el usuario ya no existe (cuenta borrada)', async () => {
    usuariosService.findById.mockResolvedValue(null);
    const payload = { sub: 999, email: 'fantasma@b.com', rol: 'GESTOR' as const, tokenVersion: 0 };

    await expect(strategy.validate(payload)).rejects.toThrow(UnauthorizedException);
  });
});
