import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./features/auth/AuthContext";
import { RequireAuth } from "./features/auth/RequireAuth";
import { LoginPage } from "./features/auth/LoginPage";
import { AppLayout } from "./layout/AppLayout";
import { ColoniasListPage } from "./features/colonias/ColoniasListPage";
import { ColoniaDetailPage } from "./features/colonias/ColoniaDetailPage";
import { GatosListPage } from "./features/gatos/GatosListPage";
import { GatoDetailPage } from "./features/gatos/GatoDetailPage";
import { ComederosListPage } from "./features/comederos/ComederosListPage";
import { ComederoDetailPage } from "./features/comederos/ComederoDetailPage";
import { VoluntariosListPage } from "./features/voluntarios/VoluntariosListPage";
import { VoluntarioDetailPage } from "./features/voluntarios/VoluntarioDetailPage";
import { AsignacionesListPage } from "./features/asignaciones/AsignacionesListPage";

export default function App() {
	return (
		<AuthProvider>
			<Routes>
				<Route path="/login" element={<LoginPage />} />
				<Route
					path="/"
					element={
						<RequireAuth>
							<AppLayout />
						</RequireAuth>
					}
				>
					<Route index element={<Navigate to="/colonias" replace />} />
					<Route path="colonias" element={<ColoniasListPage />} />
					<Route path="colonias/:id" element={<ColoniaDetailPage />} />
					<Route path="gatos" element={<GatosListPage />} />
					<Route path="gatos/:id" element={<GatoDetailPage />} />
					<Route path="comederos" element={<ComederosListPage />} />
					<Route path="comederos/:id" element={<ComederoDetailPage />} />
					<Route path="voluntarios" element={<VoluntariosListPage />} />
					<Route path="voluntarios/:id" element={<VoluntarioDetailPage />} />
					<Route path="asignaciones" element={<AsignacionesListPage />} />
				</Route>
				<Route path="*" element={<Navigate to="/" replace />} />
			</Routes>
		</AuthProvider>
	);
}
