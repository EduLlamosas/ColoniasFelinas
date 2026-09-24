import { gql } from "@apollo/client";
import { GATO_FIELDS } from "../gatos/gatos.graphql";
import { COMEDERO_FIELDS } from "../comederos/comederos.graphql";
import { ASIGNACION_WITH_VOLUNTARIO_FIELDS } from "../asignaciones/asignaciones.graphql";

export const COLONIA_FIELDS = gql`
	fragment ColoniaFields on Colonia {
		id
		codigoOficial
		nombre
		tipoSuelo
		latitud
		longitud
		observaciones
		fotoUrl
		createdAt
		updatedAt
	}
`;

// Campos que de verdad se pintan en ColoniasListScreen (tabla y mapa) - ni "observaciones" ni las
// fechas de auditoría se muestran ahí. Editar sigue pidiendo el registro completo aparte, con
// COLONIA_QUERY, para no perder "observaciones" al guardar si el formulario se abrió desde la lista.
export const COLONIA_LIST_FIELDS = gql`
	fragment ColoniaListFields on Colonia {
		id
		codigoOficial
		nombre
		tipoSuelo
		latitud
		longitud
		fotoUrl
	}
`;

export const COLONIAS_QUERY = gql`
	${COLONIA_LIST_FIELDS}
	query Colonias {
		colonias {
			...ColoniaListFields
		}
	}
`;

export const COLONIA_QUERY = gql`
	${COLONIA_FIELDS}
	query Colonia($id: ID!) {
		colonia(id: $id) {
			...ColoniaFields
		}
	}
`;

// ColoniaDetailScreen pedía antes 4 peticiones separadas (colonia + gatos/comederos/asignaciones
// filtrados). Con los resolvers anidados del backend esto se resuelve en una sola petición.
export const COLONIA_DETAIL_QUERY = gql`
	${COLONIA_FIELDS}
	${GATO_FIELDS}
	${COMEDERO_FIELDS}
	${ASIGNACION_WITH_VOLUNTARIO_FIELDS}
	query ColoniaDetail($id: ID!) {
		colonia(id: $id) {
			...ColoniaFields
			gatos {
				...GatoFields
			}
			comederos {
				...ComederoFields
			}
			asignaciones {
				...AsignacionWithVoluntarioFields
			}
		}
	}
`;

export const CREATE_COLONIA_MUTATION = gql`
	${COLONIA_FIELDS}
	mutation CreateColonia($data: CreateColoniaInput!) {
		createColonia(data: $data) {
			...ColoniaFields
		}
	}
`;

export const UPDATE_COLONIA_MUTATION = gql`
	${COLONIA_FIELDS}
	mutation UpdateColonia($id: ID!, $data: UpdateColoniaInput!) {
		updateColonia(id: $id, data: $data) {
			...ColoniaFields
		}
	}
`;
