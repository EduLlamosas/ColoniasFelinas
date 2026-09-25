import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import type { Observable } from 'rxjs';
import { setTenantContext } from './tenant-context.js';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface.js';

// Global (ver app.module.ts): para CADA query/mutación autenticada, rellena con el organizacionId
// del JWT ya validado (request.user, puesto ahí por JwtAuthGuard - los guards corren antes que los
// interceptors en NestJS) la zona de AsyncLocalStorage que tenantContextMiddleware ya abrió para
// la petición entera (ver ese comentario para el porqué de hacerlo así, en vez de abrir aquí una
// zona nueva de nivel más bajo - en corto: los campos anidados vía DataLoader se resuelven
// DESPUÉS de que este método termine, y necesitan seguir viendo el contexto).
//
// Si la operación no pasó por JwtAuthGuard (login, o una futura query realmente pública),
// request.user no existe: no se toca el contexto, que se queda en su valor por defecto (ni
// superadmin ni organización) - RLS deniega todas las filas por defecto (fail closed).
// login/crearUsuario/crearOrganizacion gestionan su propio contexto explícito (runAsSuperadmin)
// donde de verdad hace falta.
@Injectable()
export class TenantContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request =
      context.getType<'graphql'>() === 'graphql'
        ? GqlExecutionContext.create(context).getContext().req
        : context.switchToHttp().getRequest();
    const user: JwtPayload | undefined = request?.user;

    if (user) {
      setTenantContext({
        organizacionId: user.organizacionId,
        isSuperadmin: user.organizacionId === null,
      });
    }

    return next.handle();
  }
}
