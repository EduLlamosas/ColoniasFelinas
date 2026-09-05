vi.mock('bcrypt', () => ({
  hash: vi.fn(),
  compare: vi.fn(),
}));

import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service.js';
import type { UsuariosService } from '../usuarios/usuarios.service.js';
import type { JwtService } from '@nestjs/jwt';

function createUsuariosServiceMock() {
  return { create: vi.fn(), findByEmail: vi.fn(), findById: vi.fn() };
}

function createJwtServiceMock() {
  return { sign: vi.fn() };
}

describe('AuthService', () => {
  let usuariosService: ReturnType<typeof createUsuariosServiceMock>;
  let jwtService: ReturnType<typeof createJwtServiceMock>;
  let service: AuthService;

  beforeEach(() => {
    vi.clearAllMocks();
    usuariosService = createUsuariosServiceMock();
    jwtService = createJwtServiceMock();
    service = new AuthService(
      usuariosService as unknown as UsuariosService,
      jwtService as unknown as JwtService,
    );
  });

  describe('register', () => {
    it('crea el usuario y devuelve un accessToken firmado con su id, email y rol', async () => {
      usuariosService.create.mockResolvedValue({ id: '1', email: 'a@b.com', rol: 'GESTOR' });
      jwtService.sign.mockReturnValue('token-firmado');

      const result = await service.register({
        email: 'a@b.com',
        password: 'secreto123',
        nombreCompleto: 'Ana',
      });

      expect(usuariosService.create).toHaveBeenCalledWith({
        email: 'a@b.com',
        password: 'secreto123',
        nombreCompleto: 'Ana',
      });
      expect(jwtService.sign).toHaveBeenCalledWith({ sub: '1', email: 'a@b.com', rol: 'GESTOR' });
      expect(result).toEqual({
        accessToken: 'token-firmado',
        usuario: { id: '1', email: 'a@b.com', rol: 'GESTOR' },
      });
    });
  });

  describe('login', () => {
    it('lanza UnauthorizedException si el email no existe', async () => {
      usuariosService.findByEmail.mockResolvedValue(null);
      await expect(
        service.login({ email: 'nadie@x.com', password: 'x' }),
      ).rejects.toThrow(UnauthorizedException);
      expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    it('lanza UnauthorizedException si la contraseña no coincide', async () => {
      usuariosService.findByEmail.mockResolvedValue({ id: '1', passwordHash: 'hash' });
      vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

      await expect(
        service.login({ email: 'a@b.com', password: 'mala' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('devuelve accessToken y usuario cuando las credenciales son correctas', async () => {
      usuariosService.findByEmail.mockResolvedValue({
        id: '1',
        email: 'a@b.com',
        rol: 'ADMINISTRADOR',
        passwordHash: 'hash',
      });
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
      jwtService.sign.mockReturnValue('token-firmado');

      const result = await service.login({ email: 'a@b.com', password: 'correcta' });

      expect(bcrypt.compare).toHaveBeenCalledWith('correcta', 'hash');
      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: '1',
        email: 'a@b.com',
        rol: 'ADMINISTRADOR',
      });
      expect(result.accessToken).toBe('token-firmado');
    });
  });
});
