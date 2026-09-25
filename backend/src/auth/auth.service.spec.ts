vi.mock('bcrypt', () => ({
  hash: vi.fn(),
  compare: vi.fn(),
}));

import { GraphQLError } from 'graphql';
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

  describe('login', () => {
    // extensions.code: 'INVALID_CREDENTIALS', deliberadamente distinto del 'UNAUTHENTICATED'
    // genérico que usan los guards de JWT - si compartieran code, el frontend mostraría "tu
    // sesión ha caducado" al fallar un login, aunque nunca hubo sesión que caducar.
    it('lanza un GraphQLError con code INVALID_CREDENTIALS si el email no existe', async () => {
      usuariosService.findByEmail.mockResolvedValue(null);
      await expect(
        service.login({ email: 'nadie@x.com', password: 'x' }),
      ).rejects.toMatchObject({
        constructor: GraphQLError,
        extensions: { code: 'INVALID_CREDENTIALS', http: { status: 401 } },
      });
      expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    it('lanza un GraphQLError con code INVALID_CREDENTIALS si la contraseña no coincide', async () => {
      usuariosService.findByEmail.mockResolvedValue({ id: '1', passwordHash: 'hash' });
      vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

      await expect(
        service.login({ email: 'a@b.com', password: 'mala' }),
      ).rejects.toMatchObject({
        constructor: GraphQLError,
        extensions: { code: 'INVALID_CREDENTIALS', http: { status: 401 } },
      });
    });

    it('devuelve accessToken y usuario cuando las credenciales son correctas', async () => {
      usuariosService.findByEmail.mockResolvedValue({
        id: '1',
        email: 'a@b.com',
        rol: 'ADMINISTRADOR',
        organizacionId: 7,
        passwordHash: 'hash',
        tokenVersion: 3,
      });
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
      jwtService.sign.mockReturnValue('token-firmado');

      const result = await service.login({ email: 'a@b.com', password: 'correcta' });

      expect(bcrypt.compare).toHaveBeenCalledWith('correcta', 'hash');
      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: '1',
        email: 'a@b.com',
        rol: 'ADMINISTRADOR',
        organizacionId: 7,
        tokenVersion: 3,
      });
      expect(result.accessToken).toBe('token-firmado');
    });
  });
});
