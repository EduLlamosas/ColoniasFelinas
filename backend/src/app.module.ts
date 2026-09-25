import { join } from 'node:path';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { ConfigModule } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import depthLimit from 'graphql-depth-limit';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { ColoniasModule } from './colonias/colonias.module.js';
import { ComederosModule } from './comederos/comederos.module.js';
import { GatosModule } from './gatos/gatos.module.js';
import { VoluntariosModule } from './voluntarios/voluntarios.module.js';
import { AsignacionesModule } from './asignaciones/asignaciones.module.js';
import { VisitasComederoModule } from './visitas-comedero/visitas-comedero.module.js';
import { RegistrosClinicosModule } from './registros-clinicos/registros-clinicos.module.js';
import { UsuariosModule } from './usuarios/usuarios.module.js';
import { OrganizacionesModule } from './organizaciones/organizaciones.module.js';
import { AuthModule } from './auth/auth.module.js';
import { UploadsModule } from './uploads/uploads.module.js';
import { EstadisticasModule } from './estadisticas/estadisticas.module.js';
import { BenchmarkModule } from './benchmark/benchmark.module.js';
import { formatGraphqlError } from './graphql/format-error.util.js';
import { createQueryComplexityPlugin } from './graphql/query-complexity.plugin.js';
import { createLoaders } from './graphql/dataloaders.js';
import { PrismaService } from './prisma/prisma.service.js';
import { TenantContextInterceptor } from './prisma/tenant-context.interceptor.js';

// La query real más anidada del proyecto (registrosClinicos { usuario { ... } }) usa 3 niveles.
// El margen hasta 8 cubre cualquier consulta legítima futura sin dejar via libre a un cliente
// autenticado (basta ser GESTOR) que intente amplificar el coste de una petición con alias
// repetidos anidados sin límite (DoS por sobrecoste de GraphQL).
const MAX_QUERY_DEPTH = 8;

// depthLimit por sí solo no frena la amplificación por ANCHURA: una query con cientos de alias
// del mismo campo en paralelo (p. ej. "a1: colonias{...} a2: colonias{...} ...") no es profunda,
// así que pasaría el límite de arriba sin problema pese a disparar cientos de findMany() en una
// sola petición HTTP. La query real más cara del proyecto (gatos, con sus 14 campos) tiene
// complejidad ~15 con este estimador (1 por campo, sin distinguir listas de escalares); dejar el
// límite en 150 da margen de sobra a cualquier query legítima y aun así corta la amplificación
// mucho antes de las cientos de llamadas que haría falta para un DoS real. Ver
// query-complexity.plugin.ts para por qué esto es un plugin de Apollo y no una validationRule más.
const MAX_QUERY_COMPLEXITY = 150;

// BenchmarkModule es instrumentación del propio TFG (medir REST vs GraphQL) - no aporta nada a
// un ayuntamiento cliente y no debe salir en un despliegue comercial. Apagado por defecto; se
// enciende solo poniendo ENABLE_BENCHMARK_MODULE=true en el .env de desarrollo.
const ENABLE_BENCHMARK_MODULE = process.env.ENABLE_BENCHMARK_MODULE === 'true';

// Límite de fuerza bruta sobre login/register (AuthResolver, ver GqlThrottlerGuard): 5 intentos
// por minuto y por IP. Generoso para un usuario real que se equivoca de contraseña un par de
// veces, inútil para un ataque de diccionario (300 intentos/hora como máximo en vez de miles por
// segundo). @Global() en ThrottlerModule: basta con importarlo aquí una vez para que el guard
// funcione en cualquier resolver que lo use, sin tener que volver a registrar nada por módulo.
const AUTH_RATE_LIMIT_TTL_MS = 60_000;
const AUTH_RATE_LIMIT_MAX_ATTEMPTS = 5;

// MIN_FREE_DISK_MB (uploads.controller.ts) protege frente a una foto individual grande, pero no
// limita CUÁNTAS puede subir un mismo actor en total - un uso indebido y sostenido agotaría el
// disco igual, solo que más despacio. 30 subidas/hora por usuario autenticado (ver
// UploadsThrottlerGuard, que trackea por sub del JWT en vez de por IP) es de sobra para el
// trabajo de campo real y aun así acota el abuso sostenido: a 8MB máx. por foto, son ~240MB/hora
// como mucho por cuenta, no todo el disco en una tarde.
const UPLOADS_RATE_LIMIT_TTL_MS = 3_600_000;
const UPLOADS_RATE_LIMIT_MAX_ATTEMPTS = 30;

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: process.env.NODE_ENV === 'test' ? '.env.test' : '.env',
    }),
    ThrottlerModule.forRoot([
      { name: 'default', ttl: AUTH_RATE_LIMIT_TTL_MS, limit: AUTH_RATE_LIMIT_MAX_ATTEMPTS },
      { name: 'uploads', ttl: UPLOADS_RATE_LIMIT_TTL_MS, limit: UPLOADS_RATE_LIMIT_MAX_ATTEMPTS },
    ]),
    GraphQLModule.forRootAsync<ApolloDriverConfig>({
      driver: ApolloDriver,
      inject: [PrismaService],
      useFactory: (prisma: PrismaService) => ({
        autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
        sortSchema: true,
        // Un DataLoader nuevo por petición (ver dataloaders.ts): si se creara una sola vez aquí
        // fuera, su caché se compartiría entre peticiones de usuarios distintos.
        context: ({ req }: { req: unknown }) => ({ req, loaders: createLoaders(prisma) }),
        formatError: formatGraphqlError,
        validationRules: [depthLimit(MAX_QUERY_DEPTH)],
        plugins: [createQueryComplexityPlugin(MAX_QUERY_COMPLEXITY)],
      }),
    }),
    PrismaModule,
    ColoniasModule,
    ComederosModule,
    GatosModule,
    VoluntariosModule,
    AsignacionesModule,
    VisitasComederoModule,
    RegistrosClinicosModule,
    UsuariosModule,
    OrganizacionesModule,
    AuthModule,
    UploadsModule,
    EstadisticasModule,
    ...(ENABLE_BENCHMARK_MODULE ? [BenchmarkModule] : []),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Global: fija el contexto de tenant (organizacionId del JWT) para CUALQUIER query/mutación
    // autenticada, antes de que corra el resolver - ver tenant-context.interceptor.ts.
    { provide: APP_INTERCEPTOR, useClass: TenantContextInterceptor },
  ],
})
export class AppModule {}
