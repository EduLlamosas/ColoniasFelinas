import { gql } from "@apollo/client";

export const ESTADISTICAS_QUERY = gql`
	query Estadisticas($diasSinVisita: Int) {
		estadisticas(diasSinVisita: $diasSinVisita) {
			gatosPorEstadoCer {
				estadoCer
				cantidad
			}
			comederosSinVisitaReciente {
				id
				ubicacionDetallada
				ultimaVisita
			}
			esterilizacionesTrimestreActual
		}
	}
`;
