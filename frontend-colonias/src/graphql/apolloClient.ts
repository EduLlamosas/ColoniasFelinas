import { ApolloClient, InMemoryCache, HttpLink, from } from "@apollo/client";
import { ErrorLink } from "@apollo/client/link/error";
import { SetContextLink } from "@apollo/client/link/context";
import { CombinedGraphQLErrors } from "@apollo/client/errors";
import { GRAPHQL_URL } from "../lib/config";
import { clearStoredToken, getStoredToken } from "../lib/authStorage";

const httpLink = new HttpLink({ uri: GRAPHQL_URL });

const authLink = new SetContextLink(({ headers }) => {
	const token = getStoredToken();
	return {
		headers: {
			...headers,
			...(token ? { Authorization: `Bearer ${token}` } : {}),
		},
	};
});

const errorLink = new ErrorLink(({ error }) => {
	if (!CombinedGraphQLErrors.is(error)) return;
	const isUnauthenticated = error.errors.some(
		(err) => err.extensions?.code === "UNAUTHENTICATED",
	);
	if (isUnauthenticated && getStoredToken()) {
		clearStoredToken();
		window.location.href = "/login";
	}
});

export const client = new ApolloClient({
	link: from([errorLink, authLink, httpLink]),
	cache: new InMemoryCache(),
});
