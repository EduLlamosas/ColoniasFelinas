import { UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { RolUsuario } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { VoluntariosService } from './voluntarios.service.js';
import { Voluntario } from './entities/voluntario.entity.js';
import { CreateVoluntarioInput } from './dto/create-voluntario.input.js';
import { UpdateVoluntarioInput } from './dto/update-voluntario.input.js';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RolUsuario.ADMINISTRADOR, RolUsuario.GESTOR)
@Resolver(() => Voluntario)
export class VoluntariosResolver {
  constructor(private readonly voluntariosService: VoluntariosService) {}

  @Query(() => [Voluntario], { name: 'voluntarios' })
  findAll() {
    return this.voluntariosService.findAll();
  }

  @Query(() => Voluntario, { name: 'voluntario' })
  findOne(@Args('id', { type: () => ID }) id: string) {
    return this.voluntariosService.findOne(id);
  }

  @Mutation(() => Voluntario)
  createVoluntario(@Args('data') data: CreateVoluntarioInput) {
    return this.voluntariosService.create(data);
  }

  @Mutation(() => Voluntario)
  updateVoluntario(
    @Args('id', { type: () => ID }) id: string,
    @Args('data') data: UpdateVoluntarioInput,
  ) {
    return this.voluntariosService.update(id, data);
  }

  @Mutation(() => Voluntario)
  removeVoluntario(@Args('id', { type: () => ID }) id: string) {
    return this.voluntariosService.remove(id);
  }
}
