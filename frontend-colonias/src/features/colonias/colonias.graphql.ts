import { gql } from "@apollo/client";

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

export const COLONIAS_QUERY = gql`
	${COLONIA_FIELDS}
	query Colonias {
		colonias {
			...ColoniaFields
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
