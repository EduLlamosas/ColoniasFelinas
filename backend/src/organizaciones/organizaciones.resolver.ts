import { UseGuards } from '@nestjs/common';
import { Args, Int, Mutation, Query, Resolver } from '@nestjs/graphql';
import { EstadoSolicitud } from '@prisma/client';
import { OrganizacionesService } from './organizaciones.service.js';
import { Organizacion, OrganizacionCreada } from './entities/organizacion.entity.js';
import { SolicitudOrganizacion } from './entities/solicitud-organizacion.entity.js';
import { CreateOrganizacionInput } from './dto/create-organizacion.input.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { SuperadminGuard } from '../auth/guards/superadmin.guard.js';

// Todo este resolver es superadmin-only (ver SuperadminGuard) - dar de alta o listar
// organizaciones es una operación del operador del SaaS, nunca de un ADMINISTRADOR normal de un
// ayuntamiento (esos gestionan su propia organización, no las ajenas).
@UseGuards(JwtAuthGuard, SuperadminGuard)
@Resolver(() => Organizacion)
export class OrganizacionesResolver {
  constructor(private readonly organizacionesService: OrganizacionesService) {}

  @Query(() => [Organizacion])
  organizaciones() {
    return this.organizacionesService.findAll();
  }

  @Mutation(() => OrganizacionCreada)
  crearOrganizacion(@Args('data') data: CreateOrganizacionInput) {
    return this.organizacionesService.crear(data);
  }

  @Query(() => [SolicitudOrganizacion])
  solicitudesOrganizacion(
    @Args('estado', { type: () => EstadoSolicitud, nullable: true }) estado?: EstadoSolicitud,
  ) {
    return this.organizacionesService.solicitudes(estado);
  }

  @Mutation(() => Organizacion)
  aprobarSolicitudOrganizacion(@Args('id', { type: () => Int }) id: number) {
    return this.organizacionesService.aprobarSolicitud(id);
  }

  @Mutation(() => Boolean)
  rechazarSolicitudOrganizacion(
    @Args('id', { type: () => Int }) id: number,
    @Args('motivo', { nullable: true }) motivo?: string,
  ) {
    return this.organizacionesService.rechazarSolicitud(id, motivo);
  }
}
