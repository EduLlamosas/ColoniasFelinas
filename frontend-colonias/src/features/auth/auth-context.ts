import { createContext } from "react";
import type { Usuario } from "../../types/graphql";

export interface AuthContextValue {
	user: Usuario | null;
	initializing: boolean;
	isAuthenticated: boolean;
	// GESTOR es de solo lectura en los datos maestros (Colonia, Gato, Comedero, Voluntario,
	// Asignacion) - el backend ya lo bloquea con @Roles(ADMINISTRADOR), esto solo evita que
	// un GESTOR vea botones de crear/editar/borrar que le devolverían FORBIDDEN al pulsarlos.
	isAdmin: boolean;
	login: (email: string, password: string) => Promise<void>;
	logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);
