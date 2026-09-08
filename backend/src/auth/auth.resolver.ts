import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { AuthService } from './auth.service.js';
import { AuthPayload } from './entities/auth-payload.entity.js';
import { RegisterInput } from './dto/register.input.js';
import { LoginInput } from './dto/login.input.js';
import { GqlThrottlerGuard } from './guards/gql-throttler.guard.js';

// 5 intentos/minuto por IP en register y login (ver AUTH_RATE_LIMIT_* en app.module.ts): el
// vector de fuerza bruta más barato de cerrar de todo el proyecto - sin esto, login aceptaba
// intentos ilimitados por segundo desde la misma IP.
@UseGuards(GqlThrottlerGuard)
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
