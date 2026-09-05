import { gql } from "@apollo/client";

export const ASIGNACION_FIELDS = gql`
	fragment AsignacionFields on Asignacion {
		voluntarioId
		coloniaId
		rolAsignado
		createdAt
	}
`;

export const ASIGNACIONES_QUERY = gql`
	${ASIGNACION_FIELDS}
	query Asignaciones {
		asignaciones {
			...AsignacionFields
		}
	}
`;

export const CREATE_ASIGNACION_MUTATION = gql`
	${ASIGNACION_FIELDS}
	mutation CreateAsignacion($data: CreateAsignacionInput!) {
		createAsignacion(data: $data) {
			...AsignacionFields
		}
	}
`;

export const UPDATE_ASIGNACION_MUTATION = gql`
	${ASIGNACION_FIELDS}
	mutation UpdateAsignacion($voluntarioId: ID!, $coloniaId: ID!, $data: UpdateAsignacionInput!) {
		updateAsignacion(voluntarioId: $voluntarioId, coloniaId: $coloniaId, data: $data) {
			...AsignacionFields
		}
	}
`;

export const REMOVE_ASIGNACION_MUTATION = gql`
	mutation RemoveAsignacion($voluntarioId: ID!, $coloniaId: ID!) {
		removeAsignacion(voluntarioId: $voluntarioId, coloniaId: $coloniaId) {
			voluntarioId
			coloniaId
		}
	}
`;
