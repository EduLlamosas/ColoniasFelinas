import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import type { JwtPayload } from '../interfaces/jwt-payload.interface.js';

// Va siempre después de JwtAuthGuard (que rellena request.user). organizacionId===null en el JWT
// es, por diseño, la única forma de ser superadmin (ver Usuario.organizacionId) - no hay una
// tabla ni un flag aparte que comprobar.
@Injectable()
export class SuperadminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request =
      context.getType<'graphql'>() === 'graphql'
        ? GqlExecutionContext.create(context).getContext().req
        : context.switchToHttp().getRequest();
    const user: JwtPayload | undefined = request.user;
    return !!user && user.organizacionId === null;
  }
}
