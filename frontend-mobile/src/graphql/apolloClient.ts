import { ApolloClient, InMemoryCache, HttpLink, from } from "@apollo/client";
import { ErrorLink } from "@apollo/client/link/error";
import { SetContextLink } from "@apollo/client/link/context";
import { CombinedGraphQLErrors } from "@apollo/client/errors";
import { GRAPHQL_URL } from "../lib/config";
import { clearStoredToken, getStoredToken } from "../lib/authStorage";
import { encolarMutacion, esOperacionEncolable } from "./offlineQueue";

const httpLink = new HttpLink({ uri: GRAPHQL_URL });

const authLink = new SetContextLink(async ({ headers }) => {
	const token = await getStoredToken();
	return {
		headers: {
			...headers,
			...(token ? { Authorization: `Bearer ${token}` } : {}),
		},
	};
});

// A diferencia del web (que puede forzar `window.location.href = "/login"`), aquí solo
// limpiamos el token guardado: es AuthProvider quien, al perder la sesión, decide qué
// pantalla mostrar. Mientras tanto la UI puede tardar hasta la siguiente query en
// enterarse, aceptable para el MVP.
const errorLink = new ErrorLink(({ error, operation }) => {
	if (CombinedGraphQLErrors.is(error)) {
		const isUnauthenticated = error.errors.some(
			(err) => err.extensions?.code === "UNAUTHENTICATED",
		);
		if (isUnauthenticated) {
			void clearStoredToken();
		}
		return; // error de negocio real (validación, etc.) - reintentar no cambiaría el resultado
	}

	// Cualquier otro tipo de error en una de las dos mutaciones de trabajo de campo (visitas a
	// comedero, intervenciones médicas) es, en la práctica, un fallo de red real: sin cobertura,
	// timeout, DNS... Se retiene para reintentarla automáticamente en cuanto vuelva la conexión
	// (Tabla 3.7, flujo alternativo 6a) - ver offlineQueue.ts para el resto del mecanismo.
	if (operation.operationType === "mutation" && esOperacionEncolable(operation.operationName)) {
		void encolarMutacion(operation.query, operation.variables, operation.operationName);
	}
});

export const client = new ApolloClient({
	link: from([errorLink, authLink, httpLink]),
	cache: new InMemoryCache(),
});
