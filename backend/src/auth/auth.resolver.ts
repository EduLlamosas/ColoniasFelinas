import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { AuthService } from './auth.service.js';
import { AuthPayload } from './entities/auth-payload.entity.js';
import { LoginInput } from './dto/login.input.js';
import { GqlThrottlerGuard } from './guards/gql-throttler.guard.js';

// 5 intentos/minuto por IP en login (ver AUTH_RATE_LIMIT_* en app.module.ts): el vector de fuerza
// bruta más barato de cerrar de todo el proyecto - sin esto, login aceptaba intentos ilimitados
// por segundo desde la misma IP.
//
// El auto-registro público (antes "register" aquí) se ha quitado: creaba una cuenta GESTOR real
// sin ningún guard, y ningún frontend lo usaba - ver UsuariosResolver#crearUsuario (solo
// ADMINISTRADOR, siempre dentro de su propia organización) y OrganizacionesResolver#crearOrganizacion
// (solo superadmin, da de alta un ayuntamiento nuevo con su primer admin) para las vías reales de
// alta de un usuario ahora.
@UseGuards(GqlThrottlerGuard)
@Resolver()
export class AuthResolver {
  constructor(private readonly authService: AuthService) {}

  @Mutation(() => AuthPayload)
  login(@Args('data') data: LoginInput) {
    return this.authService.login(data);
  }
}
