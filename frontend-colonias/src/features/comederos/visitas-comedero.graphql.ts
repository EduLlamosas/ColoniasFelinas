import { gql } from "@apollo/client";

export const VISITA_COMEDERO_FIELDS = gql`
	fragment VisitaComederoFields on VisitaComedero {
		id
		comederoId
		piensoSeco
		comidaHumeda
		agua
		observaciones
		createdAt
	}
`;

export const VISITAS_COMEDERO_QUERY = gql`
	${VISITA_COMEDERO_FIELDS}
	query VisitasComedero($comederoId: Int!) {
		visitasComedero(comederoId: $comederoId) {
			...VisitaComederoFields
		}
	}
`;

export const REGISTRAR_VISITA_COMEDERO_MUTATION = gql`
	${VISITA_COMEDERO_FIELDS}
	mutation RegistrarVisitaComedero($data: CreateVisitaComederoInput!) {
		registrarVisitaComedero(data: $data) {
			...VisitaComederoFields
		}
	}
`;
