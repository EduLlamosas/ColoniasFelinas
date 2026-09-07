import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { RegistrosClinicosResolver } from './registros-clinicos.resolver.js';
import { RegistrosClinicosService } from './registros-clinicos.service.js';

@Module({
  imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
  providers: [RegistrosClinicosResolver, RegistrosClinicosService],
})
export class RegistrosClinicosModule {}
