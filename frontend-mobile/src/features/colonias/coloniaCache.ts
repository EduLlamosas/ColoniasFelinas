import type { ApolloCache, Reference } from "@apollo/client";
import { GATO_FIELDS } from "../gatos/gatos.graphql";
import { COMEDERO_FIELDS } from "../comederos/comederos.graphql";
import { ASIGNACION_WITH_VOLUNTARIO_FIELDS } from "../asignaciones/asignaciones.graphql";
import type { Asignacion, Comedero, Gato } from "../../types/graphql";

// ColoniaDetailScreen vive de una única COLONIA_DETAIL_QUERY, con gatos/comederos/asignaciones
// anidados dentro de la propia colonia. Apollo normaliza cada Gato/Comedero/Asignacion como
// entidad propia por su "id", así que cuando cambian sus campos escalares Apollo los actualiza
// solo en cualquier sitio donde estén embebidos. Lo que Apollo NO hace solo es la pertenencia a
// un array: crear un gato no lo añade
// automáticamente a Colonia.gatos, ni borrarlo lo quita de ahí. Estas funciones hacen justo eso,
// directamente en la caché en memoria (sin ninguna petición de red), y se llaman una vez desde la
// definición de cada mutación - no hay que acordarse de nada en cada sitio donde se usa esa
// mutación, a diferencia del enfoque anterior con refetchQueries.
//
// Nota de tipado: cache.modify de Apollo no verifica bien una clave de campo calculada
// (fields: { [field]: ... }) - por eso aquí hay un par de funciones por entidad en vez de una
// única función genérica parametrizada por nombre de campo. Tampoco sabe, sin un typePolicy
// explícito para "gatos"/"comederos"/"asignaciones", que ese campo es SIEMPRE un array - de ahí
// asList(), que normaliza el único caso (una Reference suelta) que el tipo permite pero que en la
// práctica nunca ocurre para un campo de lista.
function asList(existing: readonly unknown[] | Reference | undefined): unknown[] {
	return Array.isArray(existing) ? [...existing] : [];
}

function coloniaCacheId(cache: ApolloCache, coloniaId: number | string) {
	return cache.identify({ __typename: "Colonia", id: String(coloniaId) });
}

export function addGatoToColonia(cache: ApolloCache, gato: Gato) {
	const id = coloniaCacheId(cache, gato.coloniaId);
	if (!id) return;
	const ref = cache.writeFragment({ data: gato, fragment: GATO_FIELDS, fragmentName: "GatoFields" });
	if (!ref) return;
	cache.modify({
		id,
		fields: {
			gatos(existing, { readField }) {
				const list = asList(existing);
				if (list.some((r) => readField("id", r as never) === gato.id)) return list;
				return [...list, ref];
			},
		},
	});
}

export function removeGatoFromColonia(cache: ApolloCache, coloniaId: number | string, gatoId: string) {
	const id = coloniaCacheId(cache, coloniaId);
	if (!id) return;
	cache.modify({
		id,
		fields: {
			gatos: (existing, { readField }) => asList(existing).filter((r) => readField("id", r as never) !== gatoId),
		},
	});
}

export function addComederoToColonia(cache: ApolloCache, comedero: Comedero) {
	const id = coloniaCacheId(cache, comedero.coloniaId);
	if (!id) return;
	const ref = cache.writeFragment({ data: comedero, fragment: COMEDERO_FIELDS, fragmentName: "ComederoFields" });
	if (!ref) return;
	cache.modify({
		id,
		fields: {
			comederos(existing, { readField }) {
				const list = asList(existing);
				if (list.some((r) => readField("id", r as never) === comedero.id)) return list;
				return [...list, ref];
			},
		},
	});
}

export function removeComederoFromColonia(cache: ApolloCache, coloniaId: number | string, comederoId: string) {
	const id = coloniaCacheId(cache, coloniaId);
	if (!id) return;
	cache.modify({
		id,
		fields: {
			comederos: (existing, { readField }) =>
				asList(existing).filter((r) => readField("id", r as never) !== comederoId),
		},
	});
}

export function addAsignacionToColonia(cache: ApolloCache, asignacion: Asignacion) {
	const id = coloniaCacheId(cache, asignacion.coloniaId);
	if (!id) return;
	const ref = cache.writeFragment({
		data: asignacion,
		fragment: ASIGNACION_WITH_VOLUNTARIO_FIELDS,
		fragmentName: "AsignacionWithVoluntarioFields",
	});
	if (!ref) return;
	cache.modify({
		id,
		fields: {
			asignaciones(existing, { readField }) {
				const list = asList(existing);
				if (list.some((r) => readField("id", r as never) === asignacion.id)) return list;
				return [...list, ref];
			},
		},
	});
}

export function removeAsignacionFromColonia(cache: ApolloCache, coloniaId: number | string, asignacionId: string) {
	const id = coloniaCacheId(cache, coloniaId);
	if (!id) return;
	cache.modify({
		id,
		fields: {
			asignaciones: (existing, { readField }) =>
				asList(existing).filter((r) => readField("id", r as never) !== asignacionId),
		},
	});
}
