import { UseGuards } from '@nestjs/common';
import { Args, Int, Mutation, Query, Resolver } from '@nestjs/graphql';
import { RolUsuario } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { AsignacionesService } from './asignaciones.service.js';
import { Asignacion } from './entities/asignacion.entity.js';
import { CreateAsignacionInput } from './dto/create-asignacion.input.js';
import { UpdateAsignacionInput } from './dto/update-asignacion.input.js';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RolUsuario.ADMINISTRADOR, RolUsuario.GESTOR)
@Resolver(() => Asignacion)
export class AsignacionesResolver {
  constructor(private readonly asignacionesService: AsignacionesService) {}

  @Query(() => [Asignacion], { name: 'asignaciones' })
  findAll() {
    return this.asignacionesService.findAll();
  }

  @Query(() => Asignacion, { name: 'asignacion' })
  findOne(
    @Args('voluntarioId', { type: () => Int }) voluntarioId: number,
    @Args('coloniaId', { type: () => Int }) coloniaId: number,
  ) {
    return this.asignacionesService.findOne(voluntarioId, coloniaId);
  }

  @Mutation(() => Asignacion)
  createAsignacion(@Args('data') data: CreateAsignacionInput) {
    return this.asignacionesService.create(data);
  }

  @Mutation(() => Asignacion)
  updateAsignacion(
    @Args('voluntarioId', { type: () => Int }) voluntarioId: number,
    @Args('coloniaId', { type: () => Int }) coloniaId: number,
    @Args('data') data: UpdateAsignacionInput,
  ) {
    return this.asignacionesService.update(voluntarioId, coloniaId, data);
  }

  @Mutation(() => Asignacion)
  removeAsignacion(
    @Args('voluntarioId', { type: () => Int }) voluntarioId: number,
    @Args('coloniaId', { type: () => Int }) coloniaId: number,
  ) {
    return this.asignacionesService.remove(voluntarioId, coloniaId);
  }
}
