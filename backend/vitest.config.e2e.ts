import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';
import { config as loadDotenv } from 'dotenv';

// `test.env` es el único canal que Vitest garantiza que gane siempre en process.env de los
// workers, sin importar qué más cargue dotenv después (p. ej. el auto-load de `.env` que hace
// @prisma/client al importarse, o el de prisma.config.ts). Antes solo se fijaba NODE_ENV=test
// aquí y se confiaba en que ConfigModule.forRoot({ envFilePath: '.env.test' }) cargase el resto
// a tiempo — pero como dotenv nunca sobrescribe una variable ya presente en process.env, si algo
// cargaba `DATABASE_URL` desde `.env` (colonias_db) antes de que Nest llegase a cargar
// `.env.test`, los tests e2e acababan escribiendo y haciendo `deleteMany()` sobre la base de
// datos real en vez de `colonias_test`. Cargar `.env.test` aquí y volcarlo en `test.env` cierra
// esa carrera de una vez: da igual el orden de imports, esto siempre gana.
const { parsed: testEnv } = loadDotenv({ path: '.env.test' });

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    env: { ...testEnv, NODE_ENV: 'test' },
    // Todos los e2e-spec comparten una única base de datos real: correr
    // archivos en paralelo provocaría carreras de datos entre ellos.
    fileParallelism: false,
  },
});
