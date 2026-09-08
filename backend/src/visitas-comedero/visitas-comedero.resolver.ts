import { UseGuards } from '@nestjs/common';
import { Args, Int, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { RolUsuario } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { Usuario } from '../usuarios/entities/usuario.entity.js';
import { VisitasComederoService } from './visitas-comedero.service.js';
import { VisitaComedero } from './entities/visita-comedero.entity.js';
import { CreateVisitaComederoInput } from './dto/create-visita-comedero.input.js';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RolUsuario.ADMINISTRADOR, RolUsuario.GESTOR)
@Resolver(() => VisitaComedero)
export class VisitasComederoResolver {
  constructor(
    private readonly visitasComederoService: VisitasComederoService,
    private readonly prisma: PrismaService,
  ) {}

  @Query(() => [VisitaComedero], { name: 'visitasComedero' })
  findByComedero(@Args('comederoId', { type: () => Int }) comederoId: number) {
    return this.visitasComederoService.findByComedero(comederoId);
  }

  // usuarioId sale del JWT, nunca de `data`: así nadie puede registrar una visita en nombre
  // de otro usuario aunque manipule la petición.
  @Mutation(() => VisitaComedero)
  registrarVisitaComedero(
    @Args('data') data: CreateVisitaComederoInput,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.visitasComederoService.create(data, user.sub);
  }

  @ResolveField(() => Usuario, { name: 'usuario', nullable: true })
  async resolveUsuario(@Parent() visita: VisitaComedero) {
    if (visita.usuarioId === null) return null;
    return this.prisma.usuario.findUnique({ where: { id: visita.usuarioId } });
  }
}
