import { JwtAuthGuard } from './jwt-auth.guard.js';
import type { ExecutionContext } from '@nestjs/common';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;

  beforeEach(() => {
    guard = new JwtAuthGuard();
  });

  it('extrae la request desde el contexto de GraphQL cuando el tipo es graphql', () => {
    const req = { headers: {} };
    const context = {
      getType: () => 'graphql',
      getArgs: () => [{}, {}, { req }, {}],
      getHandler: () => function handler() {},
      getClass: () => class Resolver {},
    } as unknown as ExecutionContext;

    expect(guard.getRequest(context)).toBe(req);
  });

  it('extrae la request desde el contexto HTTP en cualquier otro caso', () => {
    const req = { headers: {} };
    const context = {
      getType: () => 'http',
      switchToHttp: () => ({ getRequest: () => req }),
    } as unknown as ExecutionContext;

    expect(guard.getRequest(context)).toBe(req);
  });
});
