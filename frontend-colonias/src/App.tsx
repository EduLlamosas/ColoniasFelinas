import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./features/auth/AuthContext";
import { RequireAuth } from "./features/auth/RequireAuth";
import { LoginPage } from "./features/auth/LoginPage";
import { LandingPage } from "./features/landing/LandingPage";
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
import { EstadisticasPage } from "./features/estadisticas/EstadisticasPage";

export default function App() {
	return (
		<AuthProvider>
			<Routes>
				<Route path="/" element={<LandingPage />} />
				<Route path="/login" element={<LoginPage />} />
				{/* Sin "path": ruta de layout que envuelve en auth sin añadir ningún segmento a la
				URL - las rutas hijas de abajo siguen siendo /colonias, /gatos/:id, etc. tal cual
				eran antes de que "/" pasara a ser la landing pública. */}
				<Route
					element={
						<RequireAuth>
							<AppLayout />
						</RequireAuth>
					}
				>
					<Route path="colonias" element={<ColoniasListPage />} />
					<Route path="colonias/:id" element={<ColoniaDetailPage />} />
					<Route path="gatos" element={<GatosListPage />} />
					<Route path="gatos/:id" element={<GatoDetailPage />} />
					<Route path="comederos" element={<ComederosListPage />} />
					<Route path="comederos/:id" element={<ComederoDetailPage />} />
					<Route path="voluntarios" element={<VoluntariosListPage />} />
					<Route path="voluntarios/:id" element={<VoluntarioDetailPage />} />
					<Route path="asignaciones" element={<AsignacionesListPage />} />
					<Route path="estadisticas" element={<EstadisticasPage />} />
				</Route>
				<Route path="*" element={<Navigate to="/" replace />} />
			</Routes>
		</AuthProvider>
	);
}
