import { UseGuards } from '@nestjs/common';
import { Args, Context, ID, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { RolUsuario } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import type { GqlContext } from '../graphql/dataloaders.js';
import { ColoniasService } from './colonias.service.js';
import { Colonia } from './entities/colonia.entity.js';
import { Gato } from '../gatos/entities/gato.entity.js';
import { Comedero } from '../comederos/entities/comedero.entity.js';
import { Asignacion } from '../asignaciones/entities/asignacion.entity.js';
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

  // Los tres campos siguientes son lo que permite escribir, en una sola query, exactamente el
  // ejemplo que justifica GraphQL en la memoria: "colonia { gatos { registrosClinicos { ... } } }"
  // - antes de esto, el esquema no tenía forma de anidar nada dentro de Colonia, y la app entera
  // tenía que descargar las tablas gatos/comederos/asignaciones completas y filtrar en el cliente.
  @ResolveField(() => [Gato], { name: 'gatos' })
  resolveGatos(@Parent() colonia: Colonia, @Context() ctx: GqlContext) {
    return ctx.loaders.gatosPorColonia.load(Number(colonia.id));
  }

  @ResolveField(() => [Comedero], { name: 'comederos' })
  resolveComederos(@Parent() colonia: Colonia, @Context() ctx: GqlContext) {
    return ctx.loaders.comederosPorColonia.load(Number(colonia.id));
  }

  @ResolveField(() => [Asignacion], { name: 'asignaciones' })
  resolveAsignaciones(@Parent() colonia: Colonia, @Context() ctx: GqlContext) {
    return ctx.loaders.asignacionesPorColonia.load(Number(colonia.id));
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
