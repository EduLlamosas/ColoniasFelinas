import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { UsuariosModule } from '../usuarios/usuarios.module.js';
import { AportacionesService } from './aportaciones.service.js';
import { AportacionesResolver } from './aportaciones.resolver.js';
import { AportacionFilterService } from './aportacion-filter.service.js';

@Module({
  imports: [PassportModule.register({ defaultStrategy: 'jwt' }), UsuariosModule],
  providers: [AportacionesService, AportacionesResolver, AportacionFilterService],
})
export class AportacionesModule {}
