import { createContext } from "react";
import type { Usuario } from "../../types/graphql";

export interface AuthContextValue {
	user: Usuario | null;
	initializing: boolean;
	isAuthenticated: boolean;
	login: (email: string, password: string) => Promise<void>;
	logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);
