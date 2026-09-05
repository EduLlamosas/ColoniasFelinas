import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { UsuariosService } from './usuarios.service.js';
import { UsuariosResolver } from './usuarios.resolver.js';

@Module({
  imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
  providers: [UsuariosService, UsuariosResolver],
  exports: [UsuariosService],
})
export class UsuariosModule {}
