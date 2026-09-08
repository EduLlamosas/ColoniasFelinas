import { UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { RolUsuario } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { ColoniasService } from './colonias.service.js';
import { Colonia } from './entities/colonia.entity.js';
import { CreateColoniaInput } from './dto/create-colonia.input.js';
import { UpdateColoniaInput } from './dto/update-colonia.input.js';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RolUsuario.ADMINISTRADOR, RolUsuario.GESTOR)
@Resolver(() => Colonia)
export class ColoniasResolver {
  constructor(private readonly coloniasService: ColoniasService) {}

  @Query(() => [Colonia], { name: 'colonias' })
  findAll() {
    return this.coloniasService.findAll();
  }

  @Query(() => Colonia, { name: 'colonia' })
  findOne(@Args('id', { type: () => ID }) id: string) {
    return this.coloniasService.findOne(id);
  }

  // Alta/edición/borrado de datos maestros reservado a ADMINISTRADOR: GESTOR se queda en
  // solo lectura para estas 5 entidades (ver §4.2 de la memoria). Las dos mutaciones que sí
  // sigue pudiendo usar un GESTOR son las de trabajo de campo (registrarVisitaComedero,
  // registrarIntervencionMedica), que no tocan este @Roles de clase.
  @Roles(RolUsuario.ADMINISTRADOR)
  @Mutation(() => Colonia)
  createColonia(@Args('data') data: CreateColoniaInput) {
    return this.coloniasService.create(data);
  }

  @Roles(RolUsuario.ADMINISTRADOR)
  @Mutation(() => Colonia)
  updateColonia(
    @Args('id', { type: () => ID }) id: string,
    @Args('data') data: UpdateColoniaInput,
  ) {
    return this.coloniasService.update(id, data);
  }

  @Roles(RolUsuario.ADMINISTRADOR)
  @Mutation(() => Boolean)
  async removeColonia(@Args('id', { type: () => ID }) id: string) {
    await this.coloniasService.remove(id);
    return true;
  }
}
