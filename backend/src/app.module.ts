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

// La query real más anidada del proyecto (registrosClinicos { usuario { ... } }) usa 3 niveles.
// El margen hasta 8 cubre cualquier consulta legítima futura sin dejar via libre a un cliente
// autenticado (basta ser GESTOR) que intente amplificar el coste de una petición con alias
// repetidos anidados sin límite (DoS por sobrecoste de GraphQL).
const MAX_QUERY_DEPTH = 8;

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
