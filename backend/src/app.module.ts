import { join } from 'node:path';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { ConfigModule } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { ColoniasModule } from './colonias/colonias.module.js';
import { ComederosModule } from './comederos/comederos.module.js';
import { GatosModule } from './gatos/gatos.module.js';
import { VoluntariosModule } from './voluntarios/voluntarios.module.js';
import { AsignacionesModule } from './asignaciones/asignaciones.module.js';
import { UsuariosModule } from './usuarios/usuarios.module.js';
import { AuthModule } from './auth/auth.module.js';
import { UploadsModule } from './uploads/uploads.module.js';
import { formatGraphqlError } from './graphql/format-error.util.js';

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
    }),
    PrismaModule,
    ColoniasModule,
    ComederosModule,
    GatosModule,
    VoluntariosModule,
    AsignacionesModule,
    UsuariosModule,
    AuthModule,
    UploadsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
