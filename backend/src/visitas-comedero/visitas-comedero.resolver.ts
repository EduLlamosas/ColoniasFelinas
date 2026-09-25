import { UseGuards } from '@nestjs/common';
import { Args, Context, Int, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { RolUsuario } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface.js';
import type { GqlContext } from '../graphql/dataloaders.js';
import { Usuario } from '../usuarios/entities/usuario.entity.js';
import { VisitasComederoService } from './visitas-comedero.service.js';
import { VisitaComedero } from './entities/visita-comedero.entity.js';
import { CreateVisitaComederoInput } from './dto/create-visita-comedero.input.js';

// VOLUNTARIO también puede leer Y registrar visitas (es la mutación de trabajo de campo por
// excelencia) - no hay override de método que reservar aquí, a diferencia de las entidades con
// mutaciones de datos maestros.
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RolUsuario.ADMINISTRADOR, RolUsuario.GESTOR, RolUsuario.VOLUNTARIO)
@Resolver(() => VisitaComedero)
export class VisitasComederoResolver {
  constructor(private readonly visitasComederoService: VisitasComederoService) {}

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
  resolveUsuario(@Parent() visita: VisitaComedero, @Context() ctx: GqlContext) {
    if (visita.usuarioId === null) return null;
    return ctx.loaders.usuarioPorId.load(visita.usuarioId);
  }
}
