import { Module } from '@nestjs/common';
import { RegistroPublicoService } from './registro-publico.service.js';
import { RegistroPublicoResolver } from './registro-publico.resolver.js';

@Module({
  providers: [RegistroPublicoService, RegistroPublicoResolver],
})
export class RegistroPublicoModule {}
