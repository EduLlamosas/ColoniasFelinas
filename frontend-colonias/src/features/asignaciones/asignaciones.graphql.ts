import { gql } from "@apollo/client";

export const ASIGNACION_FIELDS = gql`
	fragment AsignacionFields on Asignacion {
		voluntarioId
		coloniaId
		rolAsignado
		createdAt
	}
`;

// Usado tanto por CREATE_ASIGNACION_MUTATION (para que la entrada recién escrita en caché tenga
// el nombre del voluntario listo, sin esperar a un refetch) como por COLONIA_DETAIL_QUERY.
export const ASIGNACION_WITH_VOLUNTARIO_FIELDS = gql`
	${ASIGNACION_FIELDS}
	fragment AsignacionWithVoluntarioFields on Asignacion {
		...AsignacionFields
		voluntario {
			id
			nombre
		}
	}
`;

export const ASIGNACIONES_QUERY = gql`
	${ASIGNACION_FIELDS}
	query Asignaciones($coloniaId: Int, $voluntarioId: Int) {
		asignaciones(coloniaId: $coloniaId, voluntarioId: $voluntarioId) {
			...AsignacionFields
		}
	}
`;

export const CREATE_ASIGNACION_MUTATION = gql`
	${ASIGNACION_WITH_VOLUNTARIO_FIELDS}
	mutation CreateAsignacion($data: CreateAsignacionInput!) {
		createAsignacion(data: $data) {
			...AsignacionWithVoluntarioFields
		}
	}
`;

export const UPDATE_ASIGNACION_MUTATION = gql`
	${ASIGNACION_FIELDS}
	mutation UpdateAsignacion($voluntarioId: Int!, $coloniaId: Int!, $data: UpdateAsignacionInput!) {
		updateAsignacion(voluntarioId: $voluntarioId, coloniaId: $coloniaId, data: $data) {
			...AsignacionFields
		}
	}
`;

export const REMOVE_ASIGNACION_MUTATION = gql`
	mutation RemoveAsignacion($voluntarioId: Int!, $coloniaId: Int!) {
		removeAsignacion(voluntarioId: $voluntarioId, coloniaId: $coloniaId)
	}
`;
