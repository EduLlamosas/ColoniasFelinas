import { ExecutionContext, HttpException, Injectable } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { ThrottlerGuard, type ThrottlerLimitDetail } from '@nestjs/throttler';

const TOO_MANY_REQUESTS = 429;

// ThrottlerGuard, tal cual, asume un ExecutionContext REST (context.switchToHttp()) - en un
// resolver GraphQL eso devuelve un objeto vacío y el guard nunca ve la IP real, así que nunca
// limita nada. Mismo patrón que JwtAuthGuard/RolesGuard: sacar el req de verdad del contexto de
// Apollo. req.res existe porque Express lo enlaza él mismo (application.js) en cualquier petición
// enrutada, aunque el `context` de GraphQLModule.forRoot solo exponga `req` explícitamente.
@Injectable()
export class GqlThrottlerGuard extends ThrottlerGuard {
  protected override getRequestResponse(context: ExecutionContext) {
    const gqlCtx = GqlExecutionContext.create(context).getContext();
    return { req: gqlCtx.req, res: gqlCtx.req.res };
  }

  // ThrottlerException por defecto se construye con un simple string como "response", y
  // @nestjs/apollo solo traduce el status de un HttpException a extensions.status cuando
  // exceptionRef.response es un OBJETO con .statusCode (ver HttpException.createBody, que es
  // justo lo que usan NotFoundException/ConflictException por dentro) - con un string a secas
  // el error se cuela como INTERNAL_SERVER_ERROR sin más info. Replicar ese mismo shape aquí es
  // lo que permite que formatGraphqlError() lo reconozca y lo traduzca a RATE_LIMITED.
  protected override async throwThrottlingException(
    context: ExecutionContext,
    throttlerLimitDetail: ThrottlerLimitDetail,
  ): Promise<void> {
    const message = await this.getErrorMessage(context, throttlerLimitDetail);
    throw new HttpException(
      HttpException.createBody(null, message, TOO_MANY_REQUESTS),
      TOO_MANY_REQUESTS,
    );
  }
}
