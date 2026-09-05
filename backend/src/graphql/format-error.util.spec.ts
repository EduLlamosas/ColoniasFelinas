import type { GraphQLFormattedError } from 'graphql';
import { formatGraphqlError } from './format-error.util.js';

function makeError(extensions: Record<string, unknown>): GraphQLFormattedError {
  return { message: 'algo falló', extensions } as GraphQLFormattedError;
}

describe('formatGraphqlError', () => {
  it('traduce status 404 (genérico) a code NOT_FOUND', () => {
    const result = formatGraphqlError(makeError({ code: 'INTERNAL_SERVER_ERROR', status: 404 }));
    expect(result.extensions?.code).toBe('NOT_FOUND');
  });

  it('traduce status 409 (genérico) a code CONFLICT', () => {
    const result = formatGraphqlError(makeError({ code: 'INTERNAL_SERVER_ERROR', status: 409 }));
    expect(result.extensions?.code).toBe('CONFLICT');
  });

  it('no toca errores ya bien traducidos por @nestjs/apollo (400, 401, 403)', () => {
    const badRequest = makeError({ code: 'BAD_REQUEST', status: 400 });
    expect(formatGraphqlError(badRequest).extensions?.code).toBe('BAD_REQUEST');

    const unauthenticated = makeError({ code: 'UNAUTHENTICATED', status: 401 });
    expect(formatGraphqlError(unauthenticated).extensions?.code).toBe('UNAUTHENTICATED');
  });

  it('no toca un error real sin extensions.status (fallo no controlado)', () => {
    const crash = makeError({ code: 'INTERNAL_SERVER_ERROR' });
    expect(formatGraphqlError(crash)).toEqual(crash);
  });

  it('deja intacto un status sin mapeo conocido (p. ej. 500)', () => {
    const error = makeError({ code: 'INTERNAL_SERVER_ERROR', status: 500 });
    expect(formatGraphqlError(error)).toEqual(error);
  });
});
