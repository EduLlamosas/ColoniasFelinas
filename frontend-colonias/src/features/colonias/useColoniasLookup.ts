import { useMemo } from "react";
import { useQuery } from "@apollo/client/react";
import { COLONIAS_QUERY } from "./colonias.graphql";
import type { Colonia } from "../../types/graphql";

// COLONIAS_QUERY solo trae ColoniaListFields (sin "observaciones" ni fechas de auditoría) - el
// tipo aquí lo refleja a propósito, para que TypeScript avise si algún consumidor intenta leer un
// campo que este listado nunca pidió, en vez de fallar en silencio con "undefined" en producción.
export type ColoniaListItem = Pick<
	Colonia,
	"id" | "codigoOficial" | "nombre" | "tipoSuelo" | "latitud" | "longitud" | "fotoUrl"
>;

export function useColoniasLookup() {
	const { data, loading, error } = useQuery<{ colonias: ColoniaListItem[] }>(COLONIAS_QUERY);
	const colonias = useMemo(() => data?.colonias ?? [], [data]);
	const byId = useMemo(() => new Map(colonias.map((colonia) => [colonia.id, colonia])), [colonias]);

	return { colonias, byId, loading, error };
}
