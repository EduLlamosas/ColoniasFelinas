import { UseGuards } from '@nestjs/common';
import { Args, Int, Mutation, Query, Resolver } from '@nestjs/graphql';
import { RolUsuario } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { VisitasComederoService } from './visitas-comedero.service.js';
import { VisitaComedero } from './entities/visita-comedero.entity.js';
import { CreateVisitaComederoInput } from './dto/create-visita-comedero.input.js';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RolUsuario.ADMINISTRADOR, RolUsuario.GESTOR)
@Resolver(() => VisitaComedero)
export class VisitasComederoResolver {
  constructor(private readonly visitasComederoService: VisitasComederoService) {}

  @Query(() => [VisitaComedero], { name: 'visitasComedero' })
  findByComedero(@Args('comederoId', { type: () => Int }) comederoId: number) {
    return this.visitasComederoService.findByComedero(comederoId);
  }

  @Mutation(() => VisitaComedero)
  registrarVisitaComedero(@Args('data') data: CreateVisitaComederoInput) {
    return this.visitasComederoService.create(data);
  }
}
