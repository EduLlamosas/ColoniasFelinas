import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { VisitasComederoResolver } from './visitas-comedero.resolver.js';
import { VisitasComederoService } from './visitas-comedero.service.js';

@Module({
  imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
  providers: [VisitasComederoResolver, VisitasComederoService],
})
export class VisitasComederoModule {}
