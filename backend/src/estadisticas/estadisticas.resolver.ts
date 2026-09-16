import { UseGuards } from '@nestjs/common';
import { Args, Int, Query, Resolver } from '@nestjs/graphql';
import { RolUsuario } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { EstadisticasService } from './estadisticas.service.js';
import { Estadisticas } from './entities/estadisticas.entity.js';

const DIAS_SIN_VISITA_POR_DEFECTO = 7;

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RolUsuario.ADMINISTRADOR, RolUsuario.GESTOR)
@Resolver()
export class EstadisticasResolver {
  constructor(private readonly estadisticasService: EstadisticasService) {}

  @Query(() => Estadisticas, { name: 'estadisticas' })
  obtenerEstadisticas(
    @Args('diasSinVisita', { type: () => Int, nullable: true }) diasSinVisita?: number,
  ) {
    return this.estadisticasService.obtenerTodas(diasSinVisita ?? DIAS_SIN_VISITA_POR_DEFECTO);
  }
}
