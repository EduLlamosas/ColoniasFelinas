import { Navigate, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "./useAuth";
import { Spinner } from "../../components/ui/Spinner";

export function RequireAuth({ children }: { children: ReactNode }) {
	const { isAuthenticated, initializing } = useAuth();
	const location = useLocation();

	if (initializing) {
		return (
			<div className="flex h-screen items-center justify-center bg-slate-50">
				<Spinner size="lg" />
			</div>
		);
	}

	if (!isAuthenticated) {
		return <Navigate to="/login" replace state={{ from: location }} />;
	}

	return <>{children}</>;
}
