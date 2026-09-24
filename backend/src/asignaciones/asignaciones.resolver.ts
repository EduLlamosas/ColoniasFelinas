import { UseGuards } from '@nestjs/common';
import { Args, Context, Int, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
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
  findOne(
    @Args('voluntarioId', { type: () => Int }) voluntarioId: number,
    @Args('coloniaId', { type: () => Int }) coloniaId: number,
  ) {
    return this.asignacionesService.findOne(voluntarioId, coloniaId);
  }

  // Alta/edición/borrado de datos maestros reservado a ADMINISTRADOR (ver colonias.resolver.ts).
  @Roles(RolUsuario.ADMINISTRADOR)
  @Mutation(() => Asignacion)
  createAsignacion(@Args('data') data: CreateAsignacionInput) {
    return this.asignacionesService.create(data);
  }

  @Roles(RolUsuario.ADMINISTRADOR)
  @Mutation(() => Asignacion)
  updateAsignacion(
    @Args('voluntarioId', { type: () => Int }) voluntarioId: number,
    @Args('coloniaId', { type: () => Int }) coloniaId: number,
    @Args('data') data: UpdateAsignacionInput,
  ) {
    return this.asignacionesService.update(voluntarioId, coloniaId, data);
  }

  @Roles(RolUsuario.ADMINISTRADOR)
  @Mutation(() => Boolean)
  async removeAsignacion(
    @Args('voluntarioId', { type: () => Int }) voluntarioId: number,
    @Args('coloniaId', { type: () => Int }) coloniaId: number,
  ) {
    await this.asignacionesService.remove(voluntarioId, coloniaId);
    return true;
  }
}
