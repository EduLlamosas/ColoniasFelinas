import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { VoluntariosResolver } from './voluntarios.resolver.js';
import { VoluntariosService } from './voluntarios.service.js';

@Module({
  imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
  providers: [VoluntariosResolver, VoluntariosService],
})
export class VoluntariosModule {}
