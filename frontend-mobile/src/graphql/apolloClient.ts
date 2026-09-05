import { ApolloClient, InMemoryCache, HttpLink, from } from "@apollo/client";
import { ErrorLink } from "@apollo/client/link/error";
import { SetContextLink } from "@apollo/client/link/context";
import { CombinedGraphQLErrors } from "@apollo/client/errors";
import { GRAPHQL_URL } from "../lib/config";
import { clearStoredToken, getStoredToken } from "../lib/authStorage";

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
const errorLink = new ErrorLink(({ error }) => {
	if (!CombinedGraphQLErrors.is(error)) return;
	const isUnauthenticated = error.errors.some(
		(err) => err.extensions?.code === "UNAUTHENTICATED",
	);
	if (isUnauthenticated) {
		void clearStoredToken();
	}
});

export const client = new ApolloClient({
	link: from([errorLink, authLink, httpLink]),
	cache: new InMemoryCache(),
});
