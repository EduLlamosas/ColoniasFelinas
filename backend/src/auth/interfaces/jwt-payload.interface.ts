import type { RolUsuario } from '@prisma/client';

export interface JwtPayload {
  sub: number;
  email: string;
  rol: RolUsuario;
  // Comprobado contra Usuario.tokenVersion en JwtStrategy - un token firmado con una versión
  // antigua se rechaza aunque su firma y expiración sigan siendo válidas.
  tokenVersion: number;
}
