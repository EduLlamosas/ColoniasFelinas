import { gql } from "@apollo/client";

export const COMEDERO_FIELDS = gql`
	fragment ComederoFields on Comedero {
		id
		coloniaId
		ubicacionDetallada
		fotoUrl
		createdAt
		updatedAt
	}
`;

export const COMEDEROS_QUERY = gql`
	${COMEDERO_FIELDS}
	query Comederos {
		comederos {
			...ComederoFields
		}
	}
`;

export const CREATE_COMEDERO_MUTATION = gql`
	${COMEDERO_FIELDS}
	mutation CreateComedero($data: CreateComederoInput!) {
		createComedero(data: $data) {
			...ComederoFields
		}
	}
`;

export const UPDATE_COMEDERO_MUTATION = gql`
	${COMEDERO_FIELDS}
	mutation UpdateComedero($id: ID!, $data: UpdateComederoInput!) {
		updateComedero(id: $id, data: $data) {
			...ComederoFields
		}
	}
`;

export const REMOVE_COMEDERO_MUTATION = gql`
	mutation RemoveComedero($id: ID!) {
		removeComedero(id: $id) {
			id
		}
	}
`;
