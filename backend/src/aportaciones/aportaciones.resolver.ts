import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { RolUsuario } from '@prisma/client';
import { AportacionesService } from './aportaciones.service.js';
import { AportacionColonia } from './entities/aportacion-colonia.entity.js';
import { CreateAportacionColoniaInput } from './dto/create-aportacion-colonia.input.js';
import { RevisarAportacionInput } from './dto/revisar-aportacion.input.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';

@UseGuards(JwtAuthGuard, RolesGuard)
@Resolver(() => AportacionColonia)
export class AportacionesResolver {
  constructor(private readonly aportacionesService: AportacionesService) {}

  @Roles(RolUsuario.PARTICULAR)
  @Mutation(() => AportacionColonia)
  crearAportacionColonia(@Args('data') data: CreateAportacionColoniaInput) {
    return this.aportacionesService.crearColonia(data);
  }

  @Roles(RolUsuario.PARTICULAR)
  @Query(() => [AportacionColonia])
  misAportaciones() {
    return this.aportacionesService.misAportaciones();
  }

  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.GESTOR)
  @Query(() => [AportacionColonia])
  aportacionesPendientes() {
    return this.aportacionesService.aportacionesPendientes();
  }

  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.GESTOR)
  @Mutation(() => AportacionColonia)
  revisarAportacion(@Args('data') data: RevisarAportacionInput) {
    return this.aportacionesService.revisar(data);
  }
}
