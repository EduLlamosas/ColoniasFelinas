import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { defer, type Observable } from 'rxjs';
import { runWithTenantContext } from './tenant-context.js';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface.js';

// Global (ver app.module.ts): para CADA query/mutación autenticada, fija en AsyncLocalStorage el
// organizacionId del JWT ya validado (request.user, puesto ahí por JwtAuthGuard - los guards
// corren antes que los interceptors en NestJS, así que cuando esto se ejecuta el JWT ya está
// comprobado) - tenant.extension.ts lo lee para saber qué organización fijar con SET LOCAL antes
// de cada consulta a una tabla con RLS.
//
// Si la operación no pasó por JwtAuthGuard (login, o una futura query realmente pública),
// request.user no existe: no se fija ningún contexto, y tenant.extension.ts no aplica ningún SET -
// RLS deniega todas las filas por defecto (fail closed). login/crearUsuario/crearOrganizacion
// gestionan su propio contexto explícito (runAsSuperadmin) donde de verdad hace falta.
//
// defer(): un Observable normal ejecutaría next.handle() en el momento de construirlo, ANTES de
// que algo lo suscriba - con AsyncLocalStorage eso importaría, porque la propagación del contexto
// depende de que la ejecución empiece DENTRO de storage.run(). defer() retrasa la llamada a
// next.handle() hasta el momento real de la suscripción, que es cuando de verdad hace falta que
// esté activo el contexto.
@Injectable()
export class TenantContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request =
      context.getType<'graphql'>() === 'graphql'
        ? GqlExecutionContext.create(context).getContext().req
        : context.switchToHttp().getRequest();
    const user: JwtPayload | undefined = request?.user;

    if (!user) return next.handle();

    return defer(() =>
      runWithTenantContext(
        { organizacionId: user.organizacionId, isSuperadmin: user.organizacionId === null },
        () => next.handle(),
      ),
    );
  }
}
