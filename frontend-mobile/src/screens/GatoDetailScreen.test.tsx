import { fireEvent, render, screen } from "@testing-library/react-native";
import { MockedProvider } from "@apollo/client/testing/react";
import { GatoDetailScreen } from "./GatoDetailScreen";
import { GATOS_QUERY } from "../features/gatos/gatos.graphql";
import {
	REGISTRAR_INTERVENCION_MEDICA_MUTATION,
	REGISTROS_CLINICOS_QUERY,
} from "../features/gatos/registros-clinicos.graphql";
import { COLONIAS_QUERY } from "../features/colonias/colonias.graphql";
import { AuthContext } from "../features/auth/auth-context";
import type { AuthContextValue } from "../features/auth/auth-context";

const GATO_ID = "7";

const gato = {
	__typename: "Gato",
	id: GATO_ID,
	coloniaId: 1,
	nombre: "Michi",
	sexo: "HEMBRA",
	fechaNacimiento: null,
	capaPelaje: "Atigrado",
	estadoCer: "CAPTURADO",
	tieneMicrochip: false,
	numMicrochip: null,
	marcajeOreja: false,
	fotoUrl: null,
	observaciones: null,
	createdAt: "2026-01-01T00:00:00.000Z",
	updatedAt: "2026-01-01T00:00:00.000Z",
};

function registroCreado() {
	return {
		__typename: "RegistroClinico",
		id: "1",
		gatoId: 7,
		usuarioId: 1,
		usuario: { __typename: "Usuario", id: "1", nombreCompleto: "Gestor de prueba" },
		tipo: "VACUNACION",
		fecha: "2026-01-15",
		diagnostico: "Vacuna anual",
		createdAt: "2026-01-15T00:00:00.000Z",
	};
}

// Apollo normaliza en caché cualquier objeto con "id" usando __typename+id como clave - sin
// __typename la lectura posterior devuelve el objeto vacío (ver ComederoDetailScreen.test.tsx,
// donde salió por primera vez este mismo problema).
function buildMocks() {
	return [
		{ request: { query: GATOS_QUERY }, result: { data: { gatos: [gato] } } },
		{ request: { query: COLONIAS_QUERY }, result: { data: { colonias: [] } } },
		{
			request: { query: REGISTROS_CLINICOS_QUERY, variables: { gatoId: 7 } },
			result: { data: { registrosClinicos: [] } },
		},
		{
			request: {
				query: REGISTRAR_INTERVENCION_MEDICA_MUTATION,
				variables: {
					data: { gatoId: 7, tipo: "VACUNACION", fecha: "2026-01-15", diagnostico: "Vacuna anual", nuevoEstadoCer: "CAPTURADO" },
				},
			},
			result: { data: { registrarIntervencionMedica: registroCreado() } },
		},
		// refetchQueries pide REGISTROS_CLINICOS_QUERY (misma query+variables) y GATOS_QUERY (por
		// documento, sin variables) - cada uno consume una respuesta nueva aparte de la inicial.
		{
			request: { query: REGISTROS_CLINICOS_QUERY, variables: { gatoId: 7 } },
			result: { data: { registrosClinicos: [registroCreado()] } },
		},
		{ request: { query: GATOS_QUERY }, result: { data: { gatos: [gato] } } },
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

// navigation solo se usa para goBack()/navigate() en esta pantalla, nunca se lee nada más de él
// en el camino de render - un doble mínimo evita montar un NavigationContainer real.
const navigation = { goBack: jest.fn(), navigate: jest.fn() } as any;
const route = { params: { id: GATO_ID } } as any;

describe("GatoDetailScreen", () => {
	it("registra una intervención médica llamando a la mutación con los campos correctos", async () => {
		await render(
			<MockedProvider mocks={buildMocks()}>
				<AuthContext.Provider value={authValue}>
					<GatoDetailScreen route={route} navigation={navigation} />
				</AuthContext.Provider>
			</MockedProvider>,
		);

		await screen.findByText("Aún no se ha registrado ninguna intervención médica.");

		await fireEvent.press(screen.getByText("Añadir registro"));

		await fireEvent.press(screen.getByText("Vacunación"));
		await fireEvent.changeText(screen.getByPlaceholderText("AAAA-MM-DD"), "2026-01-15");
		// El diagnóstico es el único TextInput sin placeholder propio en el formulario -
		// getAllByDisplayValue tras rellenar la fecha ya no sirve, así que se localiza por el
		// texto de la etiqueta anterior más el orden de los TextInput del formulario.
		const inputs = screen.getAllByDisplayValue("");
		await fireEvent.changeText(inputs[0], "Vacuna anual");

		// nuevoEstadoCer se deja tal cual: openForm() lo preselecciona a estadoCerActual
		// ("Capturado"), que es justo lo que espera el mock de la mutación.

		await fireEvent.press(screen.getByText("Guardar"));

		// Si la mutación se hubiera llamado con variables distintas a las del mock, MockedProvider
		// no habría encontrado respuesta y el formulario seguiría abierto - que vuelva a aparecer
		// "Añadir registro" es la prueba de que el envío fue exactamente el esperado.
		await screen.findByText("Añadir registro");
	});
});
