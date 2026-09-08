import { gql } from "@apollo/client";

export const REGISTRO_CLINICO_FIELDS = gql`
	fragment RegistroClinicoFields on RegistroClinico {
		id
		gatoId
		usuarioId
		usuario {
			id
			nombreCompleto
		}
		tipo
		fecha
		diagnostico
		createdAt
	}
`;

export const REGISTROS_CLINICOS_QUERY = gql`
	${REGISTRO_CLINICO_FIELDS}
	query RegistrosClinicos($gatoId: Int!) {
		registrosClinicos(gatoId: $gatoId) {
			...RegistroClinicoFields
		}
	}
`;

export const REGISTRAR_INTERVENCION_MEDICA_MUTATION = gql`
	${REGISTRO_CLINICO_FIELDS}
	mutation RegistrarIntervencionMedica($data: CreateRegistroClinicoInput!) {
		registrarIntervencionMedica(data: $data) {
			...RegistroClinicoFields
		}
	}
`;
