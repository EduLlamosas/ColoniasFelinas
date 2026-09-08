import request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import type { PrismaService } from '../../src/prisma/prisma.service.js';
import { registerUserOrThrow } from './register-user.js';

const LOGIN = `
  mutation Login($data: LoginInput!) {
    login(data: $data) { accessToken usuario { id email rol } }
  }
`;

interface RegisterAdminOverrides {
  email?: string;
  password?: string;
  nombreCompleto?: string;
}

// register() siempre crea GESTOR (ver usuarios.service.ts) - no hay forma de auto-registrarse
// como ADMINISTRADOR vía API, así que para probar rutas reservadas a admin en e2e hay que
// promocionar el usuario directamente en BD y volver a hacer login: el rol va embebido en el
// JWT en el momento de firmarlo, no se relee en cada petición, así que el token del registro
// original se quedaría con "GESTOR" aunque la fila ya diga "ADMINISTRADOR".
export async function registerAdminOrThrow(
  app: INestApplication,
  prisma: PrismaService,
  overrides: RegisterAdminOverrides = {},
) {
  const password = overrides.password ?? 'password123';
  const { usuario } = await registerUserOrThrow(app, { ...overrides, password });

  await prisma.usuario.update({ where: { id: Number(usuario.id) }, data: { rol: 'ADMINISTRADOR' } });

  const res = await request(app.getHttpServer())
    .post('/graphql')
    .send({ query: LOGIN, variables: { data: { email: usuario.email, password } } });

  const token = res.body.data?.login?.accessToken as string | undefined;
  if (!token) {
    throw new Error(`registerAdminOrThrow: no se obtuvo accessToken tras promocionar. Respuesta: ${JSON.stringify(res.body)}`);
  }
  return { token, usuario: res.body.data.login.usuario };
}
