import { gql } from "@apollo/client";

export const VOLUNTARIO_FIELDS = gql`
	fragment VoluntarioFields on Voluntario {
		id
		dni
		nombre
		telefono
		urlCesionDatos
		createdAt
		updatedAt
	}
`;

export const VOLUNTARIOS_QUERY = gql`
	${VOLUNTARIO_FIELDS}
	query Voluntarios {
		voluntarios {
			...VoluntarioFields
		}
	}
`;

export const CREATE_VOLUNTARIO_MUTATION = gql`
	${VOLUNTARIO_FIELDS}
	mutation CreateVoluntario($data: CreateVoluntarioInput!) {
		createVoluntario(data: $data) {
			...VoluntarioFields
		}
	}
`;

export const UPDATE_VOLUNTARIO_MUTATION = gql`
	${VOLUNTARIO_FIELDS}
	mutation UpdateVoluntario($id: ID!, $data: UpdateVoluntarioInput!) {
		updateVoluntario(id: $id, data: $data) {
			...VoluntarioFields
		}
	}
`;

export const REMOVE_VOLUNTARIO_MUTATION = gql`
	mutation RemoveVoluntario($id: ID!) {
		removeVoluntario(id: $id) {
			id
		}
	}
`;
