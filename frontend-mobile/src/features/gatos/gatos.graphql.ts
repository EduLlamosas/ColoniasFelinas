import { gql } from "@apollo/client";

export const GATO_FIELDS = gql`
	fragment GatoFields on Gato {
		id
		coloniaId
		nombre
		sexo
		fechaNacimiento
		capaPelaje
		estadoCer
		tieneMicrochip
		numMicrochip
		marcajeOreja
		fotoUrl
		observaciones
		createdAt
		updatedAt
	}
`;

export const GATOS_QUERY = gql`
	${GATO_FIELDS}
	query Gatos {
		gatos {
			...GatoFields
		}
	}
`;

export const CREATE_GATO_MUTATION = gql`
	${GATO_FIELDS}
	mutation CreateGato($data: CreateGatoInput!) {
		createGato(data: $data) {
			...GatoFields
		}
	}
`;

export const UPDATE_GATO_MUTATION = gql`
	${GATO_FIELDS}
	mutation UpdateGato($id: ID!, $data: UpdateGatoInput!) {
		updateGato(id: $id, data: $data) {
			...GatoFields
		}
	}
`;
