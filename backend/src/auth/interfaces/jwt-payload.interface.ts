import type { RolUsuario } from '@prisma/client';

export interface JwtPayload {
  sub: number;
  email: string;
  rol: RolUsuario;
}
