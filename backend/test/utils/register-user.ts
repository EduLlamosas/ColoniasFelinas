import request from 'supertest';
import type { INestApplication } from '@nestjs/common';

const REGISTER = `
  mutation Register($data: RegisterInput!) {
    register(data: $data) { accessToken usuario { id email rol } }
  }
`;

let counter = 0;

interface RegisterOverrides {
  email?: string;
  password?: string;
  nombreCompleto?: string;
}

export async function registerUser(app: INestApplication, overrides: RegisterOverrides = {}) {
  counter += 1;
  const res = await request(app.getHttpServer())
    .post('/graphql')
    .send({
      query: REGISTER,
      variables: {
        data: {
          email: overrides.email ?? `e2e-user-${Date.now()}-${counter}@test.local`,
          password: overrides.password ?? 'password123',
          nombreCompleto: overrides.nombreCompleto ?? 'E2E Tester',
        },
      },
    });

  return {
    token: res.body.data?.register?.accessToken as string | undefined,
    usuario: res.body.data?.register?.usuario,
    raw: res,
  };
}

// Para montar fixtures (beforeAll de la mayoría de e2e-spec): si el registro
// falla aquí es un error real de configuración del test, no algo a probar,
// así que falla alto y claro en vez de dejar un `token` string|undefined
// suelto que solo se descubre más tarde como error de tipos.
export async function registerUserOrThrow(app: INestApplication, overrides: RegisterOverrides = {}) {
  const result = await registerUser(app, overrides);
  if (!result.token) {
    throw new Error(`registerUser: no se obtuvo accessToken. Respuesta: ${JSON.stringify(result.raw.body)}`);
  }
  return { token: result.token, usuario: result.usuario, raw: result.raw };
}
