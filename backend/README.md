# Backend — API de Colonias Felinas

API GraphQL construida con **NestJS** (code-first) y **Prisma ORM** sobre **PostgreSQL**,
más un endpoint REST híbrido para la subida de imágenes. Para la visión general del proyecto
completo (frontend web, app móvil, despliegue), consulta el
[README de la raíz del repositorio](../README.md).

## Estructura por dominio

Cada módulo de negocio sigue el mismo patrón (`*.module.ts`, `*.resolver.ts`, `*.service.ts`,
`dto/`, `entities/`), con sus tests unitarios (`*.spec.ts`) colindantes al código fuente:

```
src/
├── auth/                 JWT, guards, estrategia Passport, decorador @CurrentUser
├── usuarios/              Cuentas de acceso (roles Administrador / Gestor)
├── colonias/               Censo de colonias felinas
├── comederos/              Puntos de alimentación
├── visitas-comedero/        Auditoría de visitas/inspecciones a comederos
├── gatos/                  Ficha individual del felino, protocolo CER
├── registros-clinicos/      Historial médico por gato (transacción atómica con estado_cer)
├── voluntarios/            Colaboradores, cesión de datos RGPD obligatoria
├── asignaciones/           Relación N:M voluntario ↔ colonia
├── uploads/                 Endpoint REST de subida de imágenes (sharp: resize, WebP, EXIF)
├── prisma/                  Cliente de Prisma + traducción de errores a excepciones HTTP
├── graphql/                 Formateo de errores GraphQL (extensions.code)
├── configure-app.ts         Configuración compartida entre main.ts y los tests e2e
└── main.ts                  Punto de entrada
```

El esquema de base de datos vive en `prisma/schema.prisma`; las migraciones en
`prisma/migrations/`; los datos de demostración en `prisma/seed.ts`.

## Variables de entorno

Tres ficheros `.env` distintos, ninguno versionado (ver `.gitignore`):

| Fichero | Se usa para |
|---|---|
| `.env` | Desarrollo local (`npm run start:dev`), conecta a Postgres en `localhost` |
| `.env.docker` | Contenedor Docker, conecta a Postgres por el nombre de servicio `db` |
| `.env.test` | Suite e2e, apunta a una base de datos `colonias_test` separada |

Claves esperadas: `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `APP_URL`,
`MIN_FREE_DISK_MB` (umbral de espacio en disco por debajo del cual `/uploads` responde 507).

## Comandos habituales

```bash
npm run start:dev        # servidor con recarga en caliente
npm run lint              # oxlint

npm test                  # unitarios (Vitest)
npm run test:e2e          # e2e contra PostgreSQL real — requiere el contenedor db levantado

npx prisma migrate dev    # crear/aplicar una migración en desarrollo
npm run db:seed           # sembrar datos de demo (idempotente)
npm run db:reset          # borrar y reconstruir la base de datos desde cero + seed

npm run docker:up         # levantar todo el ecosistema en Docker
npm run docker:logs       # seguir los logs del contenedor backend
```

## GraphQL

Con el servidor arrancado, el endpoint vive en `http://localhost:3000/graphql` (Apollo
Sandbox disponible en desarrollo). El esquema se genera automáticamente en `src/schema.gql`
a partir de los decoradores — no se edita a mano.

## Tests e2e

Corren contra una base de datos PostgreSQL real (no mockeada), en `colonias_test`. Antes de
la primera vez:

```bash
npm run db:test:migrate
```

Cada fichero de `test/*.e2e-spec.ts` limpia la base de datos en `beforeAll`/`afterAll` y hace
peticiones HTTP reales contra `/graphql`, verificando también las restricciones de integridad
(`ON DELETE CASCADE`/`RESTRICT`, claves compuestas, conflictos `P2002`) directamente contra
Postgres.
