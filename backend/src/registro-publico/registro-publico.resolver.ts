import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { RegistroPublicoService } from './registro-publico.service.js';
import { OrganizacionPublica } from './entities/organizacion-publica.entity.js';
import { RegistroParticularResultado } from './entities/registro-particular-resultado.entity.js';
import { SolicitudOrganizacion } from '../organizaciones/entities/solicitud-organizacion.entity.js';
import { SolicitarOrganizacionInput } from './dto/solicitar-organizacion.input.js';
import { RegistrarParticularInput } from './dto/registrar-particular.input.js';
import { GqlThrottlerGuard } from '../auth/guards/gql-throttler.guard.js';

// Las únicas escrituras GraphQL sin JwtAuthGuard de todo el proyecto (ver el comentario en
// AuthResolver sobre por qué se cerró el auto-registro genérico) - por eso todo este resolver
// pasa por el mismo throttle que login (5/minuto/IP, ver AUTH_RATE_LIMIT_* en app.module.ts):
// sin él, cualquiera podría automatizar el envío de miles de solicitudes o cuentas particulares.
@UseGuards(GqlThrottlerGuard)
@Resolver()
export class RegistroPublicoResolver {
  constructor(private readonly registroPublicoService: RegistroPublicoService) {}

  @Query(() => [OrganizacionPublica])
  organizacionesPublicas() {
    return this.registroPublicoService.organizacionesPublicas();
  }

  @Mutation(() => SolicitudOrganizacion)
  solicitarOrganizacion(@Args('data') data: SolicitarOrganizacionInput) {
    return this.registroPublicoService.solicitarOrganizacion(data);
  }

  @Mutation(() => RegistroParticularResultado)
  registrarParticular(@Args('data') data: RegistrarParticularInput) {
    return this.registroPublicoService.registrarParticular(data);
  }

  @Mutation(() => Boolean)
  verificarEmail(@Args('token') token: string) {
    return this.registroPublicoService.verificarEmail(token);
  }
}
