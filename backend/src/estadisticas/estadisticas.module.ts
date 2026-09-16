import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { EstadisticasResolver } from './estadisticas.resolver.js';
import { EstadisticasService } from './estadisticas.service.js';

@Module({
  imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
  providers: [EstadisticasResolver, EstadisticasService],
})
export class EstadisticasModule {}
