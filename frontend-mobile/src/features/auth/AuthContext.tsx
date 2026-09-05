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
	const [user, setUser] = useState<Usuario | null>(null);
	const [initializing, setInitializing] = useState(true);

	useEffect(() => {
		let cancelled = false;

		async function hydrate() {
			const token = await getStoredToken();
			if (!token) {
				if (!cancelled) setInitializing(false);
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
					await clearStoredToken();
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
	}, [client]);

	const login = useCallback(
		async (email: string, password: string) => {
			const { data } = await client.mutate<{ login: AuthPayload }>({
				mutation: LOGIN_MUTATION,
				variables: { data: { email, password } },
			});
			if (!data) throw new Error("Respuesta de login vacía");
			await setStoredToken(data.login.accessToken);
			setUser(data.login.usuario);
		},
		[client],
	);

	const logout = useCallback(() => {
		void clearStoredToken();
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
