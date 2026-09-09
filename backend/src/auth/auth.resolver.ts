import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { SkipThrottle } from '@nestjs/throttler';
import { AuthService } from './auth.service.js';
import { AuthPayload } from './entities/auth-payload.entity.js';
import { RegisterInput } from './dto/register.input.js';
import { LoginInput } from './dto/login.input.js';
import { GqlThrottlerGuard } from './guards/gql-throttler.guard.js';

// 5 intentos/minuto por IP en register y login (ver AUTH_RATE_LIMIT_* en app.module.ts): el
// vector de fuerza bruta más barato de cerrar de todo el proyecto - sin esto, login aceptaba
// intentos ilimitados por segundo desde la misma IP.
// SkipThrottle({ uploads: true }): sin esto, el tier "uploads" (pensado solo para
// UploadsController) también se aplicaría aquí por defecto - no es incorrecto (30/hora nunca
// sería el límite que bloquee antes que el de "default"), pero es ruido innecesario.
@UseGuards(GqlThrottlerGuard)
@SkipThrottle({ uploads: true })
@Resolver()
export class AuthResolver {
  constructor(private readonly authService: AuthService) {}

  @Mutation(() => AuthPayload)
  register(@Args('data') data: RegisterInput) {
    return this.authService.register(data);
  }

  @Mutation(() => AuthPayload)
  login(@Args('data') data: LoginInput) {
    return this.authService.login(data);
  }
}
