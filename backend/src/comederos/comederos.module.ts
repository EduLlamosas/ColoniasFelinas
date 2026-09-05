import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { ComederosResolver } from './comederos.resolver.js';
import { ComederosService } from './comederos.service.js';

@Module({
  imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
  providers: [ComederosResolver, ComederosService],
})
export class ComederosModule {}
