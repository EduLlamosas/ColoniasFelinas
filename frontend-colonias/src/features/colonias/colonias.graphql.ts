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

// Campos que de verdad se pintan en la tabla/mapa de ColoniasListPage (y en cualquier desplegable
// o enlace que solo necesita el nombre de la colonia): ni "observaciones" ni las fechas de
// auditoría se muestran ahí. Para editar una colonia hace falta el registro completo - eso lo pide
// ColoniaFormModal aparte con COLONIA_QUERY, nunca el listado.
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

// La ficha de una colonia (ColoniaDetailPage) pedía antes 5 peticiones separadas: la colonia
// suelta (vía el listado completo) más gatos/comederos/asignaciones/voluntarios filtrando en el
// cliente. Con los resolvers anidados del backend (ver colonias.resolver.ts) esto se resuelve en
// una sola petición - el servidor hace el trabajo de traer solo lo de esta colonia.
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

export const REMOVE_COLONIA_MUTATION = gql`
	mutation RemoveColonia($id: ID!) {
		removeColonia(id: $id)
	}
`;
