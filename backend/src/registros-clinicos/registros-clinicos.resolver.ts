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
import { RegistrosClinicosService } from './registros-clinicos.service.js';
import { RegistroClinico } from './entities/registro-clinico.entity.js';
import { CreateRegistroClinicoInput } from './dto/create-registro-clinico.input.js';

// VETERINARIO también puede leer Y registrar intervenciones (es su trabajo) - no VOLUNTARIO, que
// no tiene acceso a historial clínico.
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RolUsuario.ADMINISTRADOR, RolUsuario.GESTOR, RolUsuario.VETERINARIO)
@Resolver(() => RegistroClinico)
export class RegistrosClinicosResolver {
  constructor(private readonly registrosClinicosService: RegistrosClinicosService) {}

  @Query(() => [RegistroClinico], { name: 'registrosClinicos' })
  findByGato(@Args('gatoId', { type: () => Int }) gatoId: number) {
    return this.registrosClinicosService.findByGato(gatoId);
  }

  // usuarioId sale del JWT, nunca de `data`: mismo motivo que en VisitasComederoResolver.
  @Mutation(() => RegistroClinico)
  registrarIntervencionMedica(
    @Args('data') data: CreateRegistroClinicoInput,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.registrosClinicosService.create(data, user.sub);
  }

  @ResolveField(() => Usuario, { name: 'usuario', nullable: true })
  resolveUsuario(@Parent() registro: RegistroClinico, @Context() ctx: GqlContext) {
    if (registro.usuarioId === null) return null;
    return ctx.loaders.usuarioPorId.load(registro.usuarioId);
  }
}
