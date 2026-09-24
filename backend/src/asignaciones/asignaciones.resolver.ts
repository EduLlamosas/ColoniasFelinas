import { UseGuards } from '@nestjs/common';
import { Args, Context, ID, Int, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { RolUsuario } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import type { GqlContext } from '../graphql/dataloaders.js';
import { AsignacionesService } from './asignaciones.service.js';
import { Asignacion } from './entities/asignacion.entity.js';
import { Voluntario } from '../voluntarios/entities/voluntario.entity.js';
import { CreateAsignacionInput } from './dto/create-asignacion.input.js';
import { UpdateAsignacionInput } from './dto/update-asignacion.input.js';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RolUsuario.ADMINISTRADOR, RolUsuario.GESTOR)
@Resolver(() => Asignacion)
export class AsignacionesResolver {
  constructor(private readonly asignacionesService: AsignacionesService) {}

  // coloniaId/voluntarioId opcionales: mismo motivo que en GatosResolver.findAll.
  @Query(() => [Asignacion], { name: 'asignaciones' })
  findAll(
    @Args('coloniaId', { type: () => Int, nullable: true }) coloniaId?: number,
    @Args('voluntarioId', { type: () => Int, nullable: true }) voluntarioId?: number,
  ) {
    return this.asignacionesService.findAll(coloniaId, voluntarioId);
  }

  @ResolveField(() => Voluntario, { name: 'voluntario', nullable: true })
  resolveVoluntario(@Parent() asignacion: Asignacion, @Context() ctx: GqlContext) {
    return ctx.loaders.voluntarioPorId.load(asignacion.voluntarioId);
  }

  @Query(() => Asignacion, { name: 'asignacion' })
  findOne(@Args('id', { type: () => ID }) id: string) {
    return this.asignacionesService.findOne(id);
  }

  // Alta/edición/borrado de datos maestros reservado a ADMINISTRADOR (ver colonias.resolver.ts).
  @Roles(RolUsuario.ADMINISTRADOR)
  @Mutation(() => Asignacion)
  createAsignacion(@Args('data') data: CreateAsignacionInput) {
    return this.asignacionesService.create(data);
  }

  @Roles(RolUsuario.ADMINISTRADOR)
  @Mutation(() => Asignacion)
  updateAsignacion(@Args('id', { type: () => ID }) id: string, @Args('data') data: UpdateAsignacionInput) {
    return this.asignacionesService.update(id, data);
  }

  @Roles(RolUsuario.ADMINISTRADOR)
  @Mutation(() => Boolean)
  async removeAsignacion(@Args('id', { type: () => ID }) id: string) {
    await this.asignacionesService.remove(id);
    return true;
  }
}
