import type { ApolloServerPlugin } from '@apollo/server';
import { GraphQLError } from 'graphql';
import { getComplexity, simpleEstimator } from 'graphql-query-complexity';

// createComplexityRule() de graphql-query-complexity se instanciaría una sola vez al arrancar el
// servidor (como validationRules), así que las "variables" que usaría para resolver argumentos de
// campo serían siempre las mismas fijadas en ese momento - no las de cada petición real. Con
// cualquier operación que declare una variable obligatoria (prácticamente todas las mutations de
// este esquema), eso rompe la propia comprobación de variables antes de llegar a calcular nada.
// Por eso esto va como plugin de Apollo (se ejecuta una vez por petición, con las variables reales
// de esa petición ya en requestContext.request.variables) y no como una entrada más de
// validationRules como depthLimit, que no necesita variables porque solo mira la forma del AST.
export function createQueryComplexityPlugin(maximumComplexity: number): ApolloServerPlugin {
  return {
    async requestDidStart() {
      return {
        async didResolveOperation({ document, request, schema, operationName }) {
          const complexity = getComplexity({
            schema,
            query: document,
            variables: request.variables,
            operationName: operationName ?? undefined,
            estimators: [simpleEstimator({ defaultComplexity: 1 })],
          });

          if (complexity > maximumComplexity) {
            // extensions.code por sí solo NO cambia el status HTTP de la respuesta (eso solo
            // reclasifica el error para el cliente) - Apollo Server solo lee extensions.http.status
            // para decidir el código HTTP real, así que hace falta ponerlo explícitamente para
            // que esto responda 400 igual que un fallo de depthLimit, en vez de un 500 genérico.
            throw new GraphQLError(
              `La query excede la complejidad máxima permitida (${maximumComplexity}). Complejidad calculada: ${complexity}`,
              { extensions: { code: 'GRAPHQL_VALIDATION_FAILED', http: { status: 400 } } },
            );
          }
        },
      };
    },
  };
}
