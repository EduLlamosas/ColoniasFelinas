import { UseGuards } from '@nestjs/common';
import { Query, Resolver } from '@nestjs/graphql';
import { UsuariosService } from './usuarios.service.js';
import { Usuario } from './entities/usuario.entity.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface.js';

@Resolver(() => Usuario)
export class UsuariosResolver {
  constructor(private readonly usuariosService: UsuariosService) {}

  @UseGuards(JwtAuthGuard)
  @Query(() => Usuario, { name: 'me' })
  me(@CurrentUser() user: JwtPayload) {
    return this.usuariosService.findById(user.sub);
  }
}
