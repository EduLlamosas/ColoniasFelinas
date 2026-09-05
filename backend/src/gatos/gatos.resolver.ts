import { UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { RolUsuario } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { GatosService } from './gatos.service.js';
import { Gato } from './entities/gato.entity.js';
import { CreateGatoInput } from './dto/create-gato.input.js';
import { UpdateGatoInput } from './dto/update-gato.input.js';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RolUsuario.ADMINISTRADOR, RolUsuario.GESTOR)
@Resolver(() => Gato)
export class GatosResolver {
  constructor(private readonly gatosService: GatosService) {}

  @Query(() => [Gato], { name: 'gatos' })
  findAll() {
    return this.gatosService.findAll();
  }

  @Query(() => Gato, { name: 'gato' })
  findOne(@Args('id', { type: () => ID }) id: string) {
    return this.gatosService.findOne(id);
  }

  @Mutation(() => Gato)
  createGato(@Args('data') data: CreateGatoInput) {
    return this.gatosService.create(data);
  }

  @Mutation(() => Gato)
  updateGato(
    @Args('id', { type: () => ID }) id: string,
    @Args('data') data: UpdateGatoInput,
  ) {
    return this.gatosService.update(id, data);
  }

  @Mutation(() => Gato)
  removeGato(@Args('id', { type: () => ID }) id: string) {
    return this.gatosService.remove(id);
  }
}
