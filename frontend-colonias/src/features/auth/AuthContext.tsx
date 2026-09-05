import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useApolloClient } from "@apollo/client/react";
import type { AuthPayload, Usuario } from "../../types/graphql";
import { clearStoredToken, getStoredToken, setStoredToken } from "../../lib/authStorage";
import { LOGIN_MUTATION, ME_QUERY } from "./auth.graphql";
import { AuthContext } from "./auth-context";
import type { AuthContextValue } from "./auth-context";

export function AuthProvider({ children }: { children: ReactNode }) {
	const client = useApolloClient();
	const [token, setToken] = useState<string | null>(() => getStoredToken());
	const [user, setUser] = useState<Usuario | null>(null);
	const [initializing, setInitializing] = useState(true);

	useEffect(() => {
		let cancelled = false;

		async function hydrate() {
			if (!token) {
				setInitializing(false);
				return;
			}
			try {
				const { data } = await client.query<{ me: Usuario }>({
					query: ME_QUERY,
					fetchPolicy: "network-only",
				});
				if (!data) throw new Error("Respuesta de 'me' vacía");
				if (!cancelled) setUser(data.me);
			} catch {
				if (!cancelled) {
					clearStoredToken();
					setToken(null);
					setUser(null);
				}
			} finally {
				if (!cancelled) setInitializing(false);
			}
		}

		void hydrate();
		return () => {
			cancelled = true;
		};
	}, [token, client]);

	const login = useCallback(
		async (email: string, password: string) => {
			const { data } = await client.mutate<{ login: AuthPayload }>({
				mutation: LOGIN_MUTATION,
				variables: { data: { email, password } },
			});
			if (!data) throw new Error("Respuesta de login vacía");
			setStoredToken(data.login.accessToken);
			setUser(data.login.usuario);
			setToken(data.login.accessToken);
		},
		[client],
	);

	const logout = useCallback(() => {
		clearStoredToken();
		setToken(null);
		setUser(null);
		void client.clearStore();
	}, [client]);

	const value = useMemo<AuthContextValue>(
		() => ({
			user,
			initializing,
			isAuthenticated: user !== null,
			login,
			logout,
		}),
		[user, initializing, login, logout],
	);

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
