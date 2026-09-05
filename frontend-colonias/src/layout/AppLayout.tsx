import { NavLink, Outlet } from "react-router-dom";
import {
	ArrowLeftStartOnRectangleIcon,
	HomeModernIcon,
	MapPinIcon,
	UserGroupIcon,
	UsersIcon,
	ClipboardDocumentListIcon,
} from "@heroicons/react/24/outline";
import { useAuth } from "../features/auth/useAuth";
import { ROL_USUARIO_LABELS } from "../lib/enums";

const NAV_ITEMS = [
	{ to: "/colonias", label: "Colonias", icon: MapPinIcon },
	{ to: "/gatos", label: "Gatos", icon: HomeModernIcon },
	{ to: "/comederos", label: "Comederos", icon: ClipboardDocumentListIcon },
	{ to: "/voluntarios", label: "Voluntarios", icon: UsersIcon },
	{ to: "/asignaciones", label: "Asignaciones", icon: UserGroupIcon },
];

export function AppLayout() {
	const { user, logout } = useAuth();

	return (
		<div className="flex h-screen bg-slate-50">
			<aside className="flex w-60 shrink-0 flex-col border-r border-slate-200 bg-white">
				<div className="flex items-center gap-2 border-b border-slate-200 px-5 py-4">
					<span className="text-lg">🐾</span>
					<span className="text-sm font-semibold text-slate-900">Colonias Felinas</span>
				</div>
				<nav className="flex-1 space-y-1 px-3 py-4">
					{NAV_ITEMS.map(({ to, label, icon: Icon }) => (
						<NavLink
							key={to}
							to={to}
							className={({ isActive }) =>
								`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
									isActive
										? "bg-teal-50 text-teal-800"
										: "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
								}`
							}
						>
							<Icon className="h-5 w-5" />
							{label}
						</NavLink>
					))}
				</nav>
				<div className="border-t border-slate-200 px-3 py-3">
					<div className="mb-2 px-2">
						<p className="truncate text-sm font-medium text-slate-800">{user?.nombreCompleto}</p>
						<p className="text-xs text-slate-500">{user && ROL_USUARIO_LABELS[user.rol]}</p>
					</div>
					<button
						type="button"
						onClick={logout}
						className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
					>
						<ArrowLeftStartOnRectangleIcon className="h-5 w-5" />
						Cerrar sesión
					</button>
				</div>
			</aside>
			<main className="flex-1 overflow-y-auto p-6">
				<Outlet />
			</main>
		</div>
	);
}
