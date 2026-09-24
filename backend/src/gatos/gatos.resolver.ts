import { UseGuards } from '@nestjs/common';
import { Args, Context, ID, Int, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { RolUsuario } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import type { GqlContext } from '../graphql/dataloaders.js';
import { GatosService } from './gatos.service.js';
import { Gato } from './entities/gato.entity.js';
import { RegistroClinico } from '../registros-clinicos/entities/registro-clinico.entity.js';
import { CreateGatoInput } from './dto/create-gato.input.js';
import { UpdateGatoInput } from './dto/update-gato.input.js';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RolUsuario.ADMINISTRADOR, RolUsuario.GESTOR)
@Resolver(() => Gato)
export class GatosResolver {
  constructor(private readonly gatosService: GatosService) {}

  // coloniaId opcional: sin él se mantiene el comportamiento de siempre (todo el censo), pero
  // permite a un cliente pedir solo los gatos de una colonia sin descargar el resto y filtrar en
  // el propio cliente, como hacía hasta ahora ColoniaDetailPage/ColoniaDetailScreen.
  @Query(() => [Gato], { name: 'gatos' })
  findAll(@Args('coloniaId', { type: () => Int, nullable: true }) coloniaId?: number) {
    return this.gatosService.findAll(coloniaId);
  }

  @Query(() => Gato, { name: 'gato' })
  findOne(@Args('id', { type: () => ID }) id: string) {
    return this.gatosService.findOne(id);
  }

  // "Últimas 3 vacunas de cada gato" del ejemplo de la memoria - ver registrosClinicosPorGato en
  // dataloaders.ts para por qué el recorte a 3 vive ahí y no aquí.
  @ResolveField(() => [RegistroClinico], { name: 'registrosClinicos' })
  resolveRegistrosClinicos(@Parent() gato: Gato, @Context() ctx: GqlContext) {
    return ctx.loaders.registrosClinicosPorGato.load(Number(gato.id));
  }

  // Alta/edición/borrado de datos maestros reservado a ADMINISTRADOR (ver colonias.resolver.ts).
  @Roles(RolUsuario.ADMINISTRADOR)
  @Mutation(() => Gato)
  createGato(@Args('data') data: CreateGatoInput) {
    return this.gatosService.create(data);
  }

  @Roles(RolUsuario.ADMINISTRADOR)
  @Mutation(() => Gato)
  updateGato(
    @Args('id', { type: () => ID }) id: string,
    @Args('data') data: UpdateGatoInput,
  ) {
    return this.gatosService.update(id, data);
  }

  @Roles(RolUsuario.ADMINISTRADOR)
  @Mutation(() => Boolean)
  async removeGato(@Args('id', { type: () => ID }) id: string) {
    await this.gatosService.remove(id);
    return true;
  }
}
