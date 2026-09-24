import { COLONIA_DETAIL_QUERY } from "./colonias.graphql";

// ColoniaDetailScreen vive de una única COLONIA_DETAIL_QUERY (colonia + sus gatos/comederos/
// asignaciones anidados) - Apollo no la refresca sola cuando se crea/edita/borra un gato, comedero
// o asignación desde otra pantalla (crear una entidad nueva no la añade automáticamente al array
// ya cacheado de la colonia). Este helper construye las entradas de refetchQueries necesarias para
// esa sincronización, a partir de los coloniaId realmente implicados - normalmente solo uno, pero
// dos si una edición cambia la colonia de un gato/comedero (hay que refrescar tanto la colonia
// antigua, para que desaparezca de su lista, como la nueva, para que aparezca en la suya). Los
// valores undefined/null/"" se ignoran, para poder pasar cómodamente valores que todavía no se
// conocen (p. ej. antes de elegir colonia en el formulario de alta).
export function coloniaDetailRefetches(...coloniaIds: Array<string | number | undefined | null>) {
	const ids = new Set(
		coloniaIds
			.filter((id): id is string | number => id !== undefined && id !== null && id !== "")
			.map(String),
	);
	return [...ids].map((id) => ({ query: COLONIA_DETAIL_QUERY, variables: { id } }));
}
