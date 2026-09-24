import { UseGuards } from '@nestjs/common';
import { Args, Context, ID, Int, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { RolUsuario } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import type { GqlContext } from '../graphql/dataloaders.js';
import { ComederosService } from './comederos.service.js';
import { Comedero } from './entities/comedero.entity.js';
import { CreateComederoInput } from './dto/create-comedero.input.js';
import { UpdateComederoInput } from './dto/update-comedero.input.js';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RolUsuario.ADMINISTRADOR, RolUsuario.GESTOR)
@Resolver(() => Comedero)
export class ComederosResolver {
  constructor(private readonly comederosService: ComederosService) {}

  // Se calcula bajo demanda (última traza de visitas-comedero) en vez de guardarse como columna
  // redundante en Comedero: una sola fuente de verdad, sin lógica extra al insertar. Antes hacía
  // un findFirst() propio por cada comedero resuelto (N+1 - deuda pendiente documentada); ahora
  // pasa por el mismo DataLoader que el resto de campos anidados (ver dataloaders.ts).
  @ResolveField(() => Date, { nullable: true })
  ultimaVisita(@Parent() comedero: Comedero, @Context() ctx: GqlContext) {
    return ctx.loaders.ultimaVisitaPorComedero.load(Number(comedero.id));
  }

  // coloniaId opcional: mismo motivo que en GatosResolver.findAll.
  @Query(() => [Comedero], { name: 'comederos' })
  findAll(@Args('coloniaId', { type: () => Int, nullable: true }) coloniaId?: number) {
    return this.comederosService.findAll(coloniaId);
  }

  @Query(() => Comedero, { name: 'comedero' })
  findOne(@Args('id', { type: () => ID }) id: string) {
    return this.comederosService.findOne(id);
  }

  // Alta/edición/borrado de datos maestros reservado a ADMINISTRADOR (ver colonias.resolver.ts).
  @Roles(RolUsuario.ADMINISTRADOR)
  @Mutation(() => Comedero)
  createComedero(@Args('data') data: CreateComederoInput) {
    return this.comederosService.create(data);
  }

  @Roles(RolUsuario.ADMINISTRADOR)
  @Mutation(() => Comedero)
  updateComedero(
    @Args('id', { type: () => ID }) id: string,
    @Args('data') data: UpdateComederoInput,
  ) {
    return this.comederosService.update(id, data);
  }

  @Roles(RolUsuario.ADMINISTRADOR)
  @Mutation(() => Boolean)
  async removeComedero(@Args('id', { type: () => ID }) id: string) {
    await this.comederosService.remove(id);
    return true;
  }
}
