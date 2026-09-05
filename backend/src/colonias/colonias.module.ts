import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { ColoniasResolver } from './colonias.resolver.js';
import { ColoniasService } from './colonias.service.js';

@Module({
  imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
  providers: [ColoniasResolver, ColoniasService],
})
export class ColoniasModule {}
