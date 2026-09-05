import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { AuthService } from './auth.service.js';
import { AuthPayload } from './entities/auth-payload.entity.js';
import { RegisterInput } from './dto/register.input.js';
import { LoginInput } from './dto/login.input.js';

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
