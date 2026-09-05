import type { GraphQLFormattedError } from 'graphql';

// @nestjs/apollo solo traduce 400/401/403/422 a un extensions.code preciso
// (BAD_REQUEST/UNAUTHENTICATED/FORBIDDEN/BAD_USER_INPUT); cualquier otro
// HttpException cae en el genérico INTERNAL_SERVER_ERROR, aunque conserva
// el status real en extensions.status. Aquí solo rellenamos ese hueco para
// los status que sí lanzamos nosotros (404, 409); un error real sin
// extensions.status (un fallo no controlado) se deja intacto.
const CODE_BY_STATUS: Record<number, string> = {
  404: 'NOT_FOUND',
  409: 'CONFLICT',
};

export function formatGraphqlError(formattedError: GraphQLFormattedError): GraphQLFormattedError {
  const status = formattedError.extensions?.status as number | undefined;
  const code = status ? CODE_BY_STATUS[status] : undefined;

  if (!code) {
    return formattedError;
  }

  return {
    ...formattedError,
    extensions: { ...formattedError.extensions, code },
  };
}
