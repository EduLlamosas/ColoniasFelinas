import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { GatosResolver } from './gatos.resolver.js';
import { GatosService } from './gatos.service.js';

@Module({
  imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
  providers: [GatosResolver, GatosService],
})
export class GatosModule {}
