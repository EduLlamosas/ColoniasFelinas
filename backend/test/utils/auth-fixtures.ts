import request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import type { RolUsuario } from '@prisma/client';
import type { PrismaService } from '../../src/prisma/prisma.service.js';
import { runAsSuperadmin } from '../../src/prisma/tenant-context.js';

const LOGIN = `
  mutation Login($data: LoginInput!) {
    login(data: $data) { accessToken usuario { id email rol } }
  }
`;

const DEFAULT_PASSWORD = 'password123';
let counter = 0;

// El auto-registro público ya no existe (ver auth.resolver.ts) - las altas reales pasan por
// crearOrganizacion/crearUsuario, que ya tienen su propia cobertura específica en
// organizaciones.e2e-spec.ts/roles.e2e-spec.ts. El resto de la suite e2e no está probando ALTA de
// usuarios, solo necesita uno ya autenticado - así que aquí se siembra directo en BD (como
// haría un seed real) y se hace login de verdad para conseguir un token real.
export async function crearOrganizacionDePrueba(prisma: PrismaService, nombre = 'Organización de prueba') {
  counter += 1;
  return runAsSuperadmin(() =>
    prisma.organizacion.create({
      data: { nombre, slug: `org-test-${Date.now()}-${counter}` },
    }),
  );
}

interface CrearUsuarioOverrides {
  email?: string;
  password?: string;
  nombreCompleto?: string;
  rol?: RolUsuario;
  // Si no se da, cada llamada monta su PROPIA organización nueva (mismo comportamiento que el
  // antiguo registerUserOrThrow: cada usuario, aislado). Pásalo explícito cuando el test necesite
  // varios usuarios en la MISMA organización (ver roles.e2e-spec.ts).
  organizacionId?: number;
}

export async function crearUsuarioDePrueba(
  app: INestApplication,
  prisma: PrismaService,
  overrides: CrearUsuarioOverrides = {},
) {
  counter += 1;
  const password = overrides.password ?? DEFAULT_PASSWORD;
  const email = overrides.email ?? `e2e-user-${Date.now()}-${counter}@test.local`;
  const passwordHash = await bcrypt.hash(password, 10);
  const organizacionId =
    overrides.organizacionId ?? (await crearOrganizacionDePrueba(prisma)).id;

  await runAsSuperadmin(() =>
    prisma.usuario.create({
      data: {
        email,
        passwordHash,
        nombreCompleto: overrides.nombreCompleto ?? 'E2E Tester',
        rol: overrides.rol ?? 'GESTOR',
        organizacionId,
      },
    }),
  );

  const res = await request(app.getHttpServer())
    .post('/graphql')
    .send({ query: LOGIN, variables: { data: { email, password } } });

  const token = res.body.data?.login?.accessToken as string | undefined;
  if (!token) {
    throw new Error(
      `crearUsuarioDePrueba: no se obtuvo accessToken tras login. Respuesta: ${JSON.stringify(res.body)}`,
    );
  }
  return { token, usuario: res.body.data.login.usuario, organizacionId };
}

// Azúcar sobre crearUsuarioDePrueba - la inmensa mayoría de specs solo necesitan "dame un
// GESTOR ya autenticado" o "dame un ADMINISTRADOR ya autenticado", no les importa el resto.
export function crearGestorDePrueba(
  app: INestApplication,
  prisma: PrismaService,
  overrides: Omit<CrearUsuarioOverrides, 'rol'> = {},
) {
  return crearUsuarioDePrueba(app, prisma, { ...overrides, rol: 'GESTOR' });
}

export function crearAdminDePrueba(
  app: INestApplication,
  prisma: PrismaService,
  overrides: Omit<CrearUsuarioOverrides, 'rol'> = {},
) {
  return crearUsuarioDePrueba(app, prisma, { ...overrides, rol: 'ADMINISTRADOR' });
}

// organizacionId: null - el superadmin no pertenece a ninguna organización (ver
// Usuario.organizacionId / SuperadminGuard). Es el único caso de esta suite que no pasa por
// crearUsuarioDePrueba: esa función siempre crea/usa una Organizacion real.
export async function crearSuperadminDePrueba(
  app: INestApplication,
  prisma: PrismaService,
  overrides: { email?: string; password?: string; nombreCompleto?: string } = {},
) {
  counter += 1;
  const password = overrides.password ?? DEFAULT_PASSWORD;
  const email = overrides.email ?? `e2e-superadmin-${Date.now()}-${counter}@test.local`;
  const passwordHash = await bcrypt.hash(password, 10);

  await runAsSuperadmin(() =>
    prisma.usuario.create({
      data: {
        email,
        passwordHash,
        nombreCompleto: overrides.nombreCompleto ?? 'Superadmin E2E',
        rol: 'ADMINISTRADOR',
        organizacionId: null,
      },
    }),
  );

  const res = await request(app.getHttpServer())
    .post('/graphql')
    .send({ query: LOGIN, variables: { data: { email, password } } });

  const token = res.body.data?.login?.accessToken as string | undefined;
  if (!token) {
    throw new Error(
      `crearSuperadminDePrueba: no se obtuvo accessToken tras login. Respuesta: ${JSON.stringify(res.body)}`,
    );
  }
  return { token, usuario: res.body.data.login.usuario };
}
