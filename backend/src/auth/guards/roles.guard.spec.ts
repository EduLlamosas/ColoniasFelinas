import { RolesGuard } from './roles.guard.js';
import type { Reflector } from '@nestjs/core';
import type { ExecutionContext } from '@nestjs/common';

function createReflectorMock(requiredRoles: string[] | undefined) {
  return { getAllAndOverride: vi.fn().mockReturnValue(requiredRoles) } as unknown as Reflector;
}

function createHttpContext(user: unknown): ExecutionContext {
  return {
    getType: () => 'http',
    getHandler: () => function handler() {},
    getClass: () => class Controller {},
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

function createGraphqlContext(user: unknown): ExecutionContext {
  return {
    getType: () => 'graphql',
    getArgs: () => [{}, {}, { req: { user } }, {}],
    getHandler: () => function handler() {},
    getClass: () => class Resolver {},
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  it('permite el paso si el handler no declara @Roles()', () => {
    const guard = new RolesGuard(createReflectorMock(undefined));
    expect(guard.canActivate(createHttpContext(undefined))).toBe(true);
  });

  it('permite el paso si @Roles() se declaró vacío', () => {
    const guard = new RolesGuard(createReflectorMock([]));
    expect(guard.canActivate(createHttpContext(undefined))).toBe(true);
  });

  it('deniega si no hay usuario en la petición (REST)', () => {
    const guard = new RolesGuard(createReflectorMock(['ADMINISTRADOR']));
    expect(guard.canActivate(createHttpContext(undefined))).toBe(false);
  });

  it('deniega si el rol del usuario no está entre los permitidos (REST)', () => {
    const guard = new RolesGuard(createReflectorMock(['ADMINISTRADOR']));
    expect(guard.canActivate(createHttpContext({ rol: 'GESTOR' }))).toBe(false);
  });

  it('permite si el rol del usuario está entre los permitidos (REST)', () => {
    const guard = new RolesGuard(createReflectorMock(['ADMINISTRADOR', 'GESTOR']));
    expect(guard.canActivate(createHttpContext({ rol: 'GESTOR' }))).toBe(true);
  });

  it('lee el usuario desde el contexto de GraphQL cuando el tipo es graphql', () => {
    const guard = new RolesGuard(createReflectorMock(['GESTOR']));
    expect(guard.canActivate(createGraphqlContext({ rol: 'GESTOR' }))).toBe(true);
    expect(guard.canActivate(createGraphqlContext({ rol: 'ADMINISTRADOR' }))).toBe(false);
  });
});
