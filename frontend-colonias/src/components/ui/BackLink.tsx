import type { MouseEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";

interface BackLinkProps {
	fallbackTo: string;
	fallbackLabel: string;
}

// "Volver" tiene que deshacer el camino real que trajo al usuario hasta aquí (p. ej. Colonias
// -> detalle de colonia -> detalle de gato), no saltar siempre al listado general del recurso
// actual. location.key === "default" solo ocurre en la primera entrada al historial de la
// pestaña (carga directa, recarga, enlace externo): ahí no hay nada dentro de la app a lo que
// volver, así que se usa el fallback. En cualquier otro caso sí hay un paso previo real y se
// retrocede por el historial del navegador.
export function BackLink({ fallbackTo, fallbackLabel }: BackLinkProps) {
	const navigate = useNavigate();
	const location = useLocation();
	const hasInAppHistory = location.key !== "default";

	function handleClick(event: MouseEvent<HTMLAnchorElement>) {
		if (hasInAppHistory && event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
			event.preventDefault();
			navigate(-1);
		}
	}

	return (
		<Link
			to={fallbackTo}
			onClick={handleClick}
			className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
		>
			<ArrowLeftIcon className="h-4 w-4" />
			{fallbackLabel}
		</Link>
	);
}
