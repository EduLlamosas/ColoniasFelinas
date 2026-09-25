import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { OrganizacionesService } from './organizaciones.service.js';
import { OrganizacionesResolver } from './organizaciones.resolver.js';

@Module({
  imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
  providers: [OrganizacionesService, OrganizacionesResolver],
  exports: [OrganizacionesService],
})
export class OrganizacionesModule {}
