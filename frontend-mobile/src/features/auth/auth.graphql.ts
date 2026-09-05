import { gql } from "@apollo/client";

export const LOGIN_MUTATION = gql`
	mutation Login($data: LoginInput!) {
		login(data: $data) {
			accessToken
			usuario {
				id
				email
				nombreCompleto
				rol
			}
		}
	}
`;

export const ME_QUERY = gql`
	query Me {
		me {
			id
			email
			nombreCompleto
			rol
		}
	}
`;
