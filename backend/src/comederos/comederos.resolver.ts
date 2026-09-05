import { UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { RolUsuario } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { ComederosService } from './comederos.service.js';
import { Comedero } from './entities/comedero.entity.js';
import { CreateComederoInput } from './dto/create-comedero.input.js';
import { UpdateComederoInput } from './dto/update-comedero.input.js';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RolUsuario.ADMINISTRADOR, RolUsuario.GESTOR)
@Resolver(() => Comedero)
export class ComederosResolver {
  constructor(private readonly comederosService: ComederosService) {}

  @Query(() => [Comedero], { name: 'comederos' })
  findAll() {
    return this.comederosService.findAll();
  }

  @Query(() => Comedero, { name: 'comedero' })
  findOne(@Args('id', { type: () => ID }) id: string) {
    return this.comederosService.findOne(id);
  }

  @Mutation(() => Comedero)
  createComedero(@Args('data') data: CreateComederoInput) {
    return this.comederosService.create(data);
  }

  @Mutation(() => Comedero)
  updateComedero(
    @Args('id', { type: () => ID }) id: string,
    @Args('data') data: UpdateComederoInput,
  ) {
    return this.comederosService.update(id, data);
  }

  @Mutation(() => Boolean)
  async removeComedero(@Args('id', { type: () => ID }) id: string) {
    await this.comederosService.remove(id);
    return true;
  }
}
