import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { BenchmarkController } from './benchmark.controller.js';

// Módulo aislado a propósito: agrupa el único controlador que existe exclusivamente para medir
// REST vs GraphQL (ver benchmark.controller.ts), separado del resto de módulos "de negocio" para
// que quede claro, con solo mirar la estructura de carpetas, que esto no es parte del dominio de
// la aplicación. Mismo PassportModule que uploads.module.ts: JwtAuthGuard necesita la estrategia
// "jwt" registrada en el propio módulo del controlador, AuthModule no es @Global().
@Module({
  imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
  controllers: [BenchmarkController],
})
export class BenchmarkModule {}
