import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AsignacionesResolver } from './asignaciones.resolver.js';
import { AsignacionesService } from './asignaciones.service.js';

@Module({
  imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
  providers: [AsignacionesResolver, AsignacionesService],
})
export class AsignacionesModule {}
