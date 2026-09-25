import type { RolUsuario } from '@prisma/client';

export interface JwtPayload {
  sub: number;
  email: string;
  rol: RolUsuario;
  // null = superadmin (el operador del SaaS, ver Usuario.organizacionId). TenantContextInterceptor
  // lo usa para fijar el contexto de tenant de toda la petición - de aquí sale, nunca de un
  // argumento que mande el cliente.
  organizacionId: number | null;
  // Comprobado contra Usuario.tokenVersion en JwtStrategy - un token firmado con una versión
  // antigua se rechaza aunque su firma y expiración sigan siendo válidas.
  tokenVersion: number;
}
