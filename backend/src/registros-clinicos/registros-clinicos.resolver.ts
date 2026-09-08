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
import { RegistrosClinicosService } from './registros-clinicos.service.js';
import { RegistroClinico } from './entities/registro-clinico.entity.js';
import { CreateRegistroClinicoInput } from './dto/create-registro-clinico.input.js';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RolUsuario.ADMINISTRADOR, RolUsuario.GESTOR)
@Resolver(() => RegistroClinico)
export class RegistrosClinicosResolver {
  constructor(
    private readonly registrosClinicosService: RegistrosClinicosService,
    private readonly prisma: PrismaService,
  ) {}

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
  async resolveUsuario(@Parent() registro: RegistroClinico) {
    if (registro.usuarioId === null) return null;
    return this.prisma.usuario.findUnique({ where: { id: registro.usuarioId } });
  }
}
