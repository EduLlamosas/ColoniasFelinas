import { join } from 'node:path';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { ConfigModule } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { Module } from '@nestjs/common';
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
import { AuthModule } from './auth/auth.module.js';
import { UploadsModule } from './uploads/uploads.module.js';
import { formatGraphqlError } from './graphql/format-error.util.js';
import { createQueryComplexityPlugin } from './graphql/query-complexity.plugin.js';

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

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: process.env.NODE_ENV === 'test' ? '.env.test' : '.env',
    }),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
      sortSchema: true,
      context: ({ req }: { req: unknown }) => ({ req }),
      formatError: formatGraphqlError,
      validationRules: [depthLimit(MAX_QUERY_DEPTH)],
      plugins: [createQueryComplexityPlugin(MAX_QUERY_COMPLEXITY)],
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
    AuthModule,
    UploadsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
