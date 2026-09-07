import { UseGuards } from '@nestjs/common';
import { Args, Int, Mutation, Query, Resolver } from '@nestjs/graphql';
import { RolUsuario } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { RegistrosClinicosService } from './registros-clinicos.service.js';
import { RegistroClinico } from './entities/registro-clinico.entity.js';
import { CreateRegistroClinicoInput } from './dto/create-registro-clinico.input.js';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RolUsuario.ADMINISTRADOR, RolUsuario.GESTOR)
@Resolver(() => RegistroClinico)
export class RegistrosClinicosResolver {
  constructor(private readonly registrosClinicosService: RegistrosClinicosService) {}

  @Query(() => [RegistroClinico], { name: 'registrosClinicos' })
  findByGato(@Args('gatoId', { type: () => Int }) gatoId: number) {
    return this.registrosClinicosService.findByGato(gatoId);
  }

  @Mutation(() => RegistroClinico)
  registrarIntervencionMedica(@Args('data') data: CreateRegistroClinicoInput) {
    return this.registrosClinicosService.create(data);
  }
}
