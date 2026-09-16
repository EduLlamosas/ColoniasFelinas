import { fireEvent, render, screen } from "@testing-library/react-native";
import { MockedProvider } from "@apollo/client/testing/react";
import { ComederoDetailScreen } from "./ComederoDetailScreen";
import { COMEDEROS_QUERY } from "../features/comederos/comederos.graphql";
import {
	REGISTRAR_VISITA_COMEDERO_MUTATION,
	VISITAS_COMEDERO_QUERY,
} from "../features/comederos/visitas-comedero.graphql";
import { COLONIAS_QUERY } from "../features/colonias/colonias.graphql";
import { AuthContext } from "../features/auth/auth-context";
import type { AuthContextValue } from "../features/auth/auth-context";

const COMEDERO_ID = "5";

const comedero = {
	__typename: "Comedero",
	id: COMEDERO_ID,
	coloniaId: 1,
	ubicacionDetallada: "Junto al banco",
	fotoUrl: null,
	createdAt: "2026-01-01T00:00:00.000Z",
	updatedAt: "2026-01-01T00:00:00.000Z",
};

function visitaRegistrada() {
	return {
		__typename: "VisitaComedero",
		id: "1",
		comederoId: 5,
		usuarioId: 1,
		usuario: { __typename: "Usuario", id: "1", nombreCompleto: "Gestor de prueba" },
		piensoSeco: true,
		comidaHumeda: false,
		agua: true,
		observaciones: "Comedero muy sucio",
		createdAt: "2026-01-02T00:00:00.000Z",
	};
}

// Apollo normaliza en caché cualquier objeto con "id" usando __typename+id como clave - sin
// __typename, no sabe a qué entidad pertenece y la lectura posterior devuelve un objeto vacío
// en vez del real (esto costó un buen rato depurar: el mock "funcionaba" sin errores, pero
// todos los campos del comedero llegaban undefined al componente).
function buildMocks() {
	return [
		{ request: { query: COMEDEROS_QUERY }, result: { data: { comederos: [comedero] } } },
		{ request: { query: COLONIAS_QUERY }, result: { data: { colonias: [] } } },
		{
			request: { query: VISITAS_COMEDERO_QUERY, variables: { comederoId: 5 } },
			result: { data: { visitasComedero: [] } },
		},
		{
			request: {
				query: REGISTRAR_VISITA_COMEDERO_MUTATION,
				variables: {
					data: { comederoId: 5, piensoSeco: true, comidaHumeda: false, agua: true, observaciones: "Comedero muy sucio" },
				},
			},
			result: { data: { registrarVisitaComedero: visitaRegistrada() } },
		},
		// refetchQueries especifica la MISMA query+variables (no por nombre), así que hace falta
		// una segunda respuesta para VISITAS_COMEDERO_QUERY: la primera se consume en el render
		// inicial, esta segunda en el refetch tras el registro.
		{
			request: { query: VISITAS_COMEDERO_QUERY, variables: { comederoId: 5 } },
			result: { data: { visitasComedero: [visitaRegistrada()] } },
		},
	];
}

const authValue: AuthContextValue = {
	user: { id: "1", email: "gestor@test.local", nombreCompleto: "Gestor de prueba", rol: "GESTOR", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" },
	initializing: false,
	isAuthenticated: true,
	isAdmin: false,
	login: jest.fn(),
	logout: jest.fn(),
};

// navigation solo se usa para goBack()/navigate() en esta pantalla, nunca se lee nada más de
// él en el camino de render - un doble mínimo evita tener que montar un NavigationContainer
// real solo para esta prueba.
const navigation = { goBack: jest.fn(), navigate: jest.fn() } as any;
const route = { params: { id: COMEDERO_ID } } as any;

describe("ComederoDetailScreen", () => {
	it("registra una visita llamando a la mutación con los campos correctos", async () => {
		// render() es async en esta versión de @testing-library/react-native - sin el await, el
		// "screen" global todavía no está enlazado al árbol renderizado cuando se usa justo
		// debajo, y falla con "render function has not been called".
		await render(
			<MockedProvider mocks={buildMocks()}>
				<AuthContext.Provider value={authValue}>
					<ComederoDetailScreen route={route} navigation={navigation} />
				</AuthContext.Provider>
			</MockedProvider>,
		);

		await screen.findByText("Aún no se ha registrado ninguna visita.");

		// fireEvent.press/changeText son async en esta versión (devuelven Promise, envuelven la
		// actualización en act() internamente) - sin el await, la siguiente consulta ve el árbol
		// de antes de que el estado se actualice.
		await fireEvent.press(screen.getByText("Registrar visita"));

		await fireEvent.press(screen.getByText("Pienso seco"));
		await fireEvent.press(screen.getByText("Agua"));
		await fireEvent.changeText(
			screen.getByPlaceholderText("Observaciones (suciedad, desperfectos...)"),
			"Comedero muy sucio",
		);

		await fireEvent.press(screen.getByText("Confirmar registro"));

		// Si la mutación se hubiera llamado con variables distintas a las del mock (p. ej. con
		// comidaHumeda: true, que nunca se marcó), MockedProvider no encontraría respuesta y el
		// formulario seguiría abierto - que vuelva a aparecer "Registrar visita" es la prueba de
		// que el envío fue exactamente el esperado.
		await screen.findByText("Registrar visita");
	});
});
