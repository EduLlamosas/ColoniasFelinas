import { useMemo } from "react";
import { useQuery } from "@apollo/client/react";
import { COLONIAS_QUERY } from "./colonias.graphql";
import type { Colonia } from "../../types/graphql";

export function useColoniasLookup() {
	const { data, loading, error } = useQuery<{ colonias: Colonia[] }>(COLONIAS_QUERY);
	const colonias = useMemo(() => data?.colonias ?? [], [data]);
	const byId = useMemo(() => new Map(colonias.map((colonia) => [colonia.id, colonia])), [colonias]);

	return { colonias, byId, loading, error };
}
