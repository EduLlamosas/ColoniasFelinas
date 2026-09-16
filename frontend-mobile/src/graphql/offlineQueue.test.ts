jest.mock("@react-native-async-storage/async-storage", () =>
	require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

import AsyncStorage from "@react-native-async-storage/async-storage";
import { gql } from "@apollo/client";
import { CombinedGraphQLErrors } from "@apollo/client/errors";
import { encolarMutacion, esOperacionEncolable, vaciarColaOffline } from "./offlineQueue";
import type { ApolloClient } from "@apollo/client";

const MUTACION_DE_PRUEBA = gql`
	mutation RegistrarVisitaComedero($data: CreateVisitaComederoInput!) {
		registrarVisitaComedero(data: $data) {
			id
		}
	}
`;

function createClientMock() {
	return { mutate: jest.fn() };
}

beforeEach(async () => {
	await AsyncStorage.clear();
});

describe("esOperacionEncolable", () => {
	it("reconoce las dos mutaciones de trabajo de campo", () => {
		expect(esOperacionEncolable("RegistrarVisitaComedero")).toBe(true);
		expect(esOperacionEncolable("RegistrarIntervencionMedica")).toBe(true);
	});

	it("no encola mutaciones de datos maestros ni operaciones sin nombre", () => {
		expect(esOperacionEncolable("RemoveColonia")).toBe(false);
		expect(esOperacionEncolable(undefined)).toBe(false);
	});
});

describe("vaciarColaOffline", () => {
	it("reintenta una mutación encolada y la quita de la cola si el reintento tiene éxito", async () => {
		await encolarMutacion(MUTACION_DE_PRUEBA, { data: { comederoId: 5, agua: true } }, "RegistrarVisitaComedero");

		const client = createClientMock();
		client.mutate.mockResolvedValue({ data: { registrarVisitaComedero: { id: "1" } } });

		await vaciarColaOffline(client as unknown as ApolloClient);

		expect(client.mutate).toHaveBeenCalledTimes(1);
		expect(client.mutate).toHaveBeenCalledWith(
			expect.objectContaining({ variables: { data: { comederoId: 5, agua: true } } }),
		);

		// Segunda pasada sin nada nuevo que enviar: si se hubiera quedado en la cola por error,
		// mutate se volvería a llamar aquí.
		client.mutate.mockClear();
		await vaciarColaOffline(client as unknown as ApolloClient);
		expect(client.mutate).not.toHaveBeenCalled();
	});

	it("conserva en la cola una mutación que vuelve a fallar por red (para el siguiente intento)", async () => {
		await encolarMutacion(MUTACION_DE_PRUEBA, { data: { comederoId: 5, agua: true } }, "RegistrarVisitaComedero");

		const client = createClientMock();
		client.mutate.mockRejectedValue(new Error("Network request failed"));
		await vaciarColaOffline(client as unknown as ApolloClient);

		// Con conexión de vuelta esta vez, la misma mutación se reintenta y ahora sí funciona -
		// prueba de que seguía en la cola tras el primer intento fallido.
		client.mutate.mockReset();
		client.mutate.mockResolvedValue({ data: { registrarVisitaComedero: { id: "1" } } });
		await vaciarColaOffline(client as unknown as ApolloClient);
		expect(client.mutate).toHaveBeenCalledTimes(1);
	});

	it("descarta (no reintenta indefinidamente) una mutación que el servidor rechaza por un error real de validación", async () => {
		await encolarMutacion(
			MUTACION_DE_PRUEBA,
			{ data: { comederoId: 999999, agua: true } },
			"RegistrarVisitaComedero",
		);

		const client = createClientMock();
		client.mutate.mockRejectedValue(
			new CombinedGraphQLErrors({ data: null, errors: [{ message: "Comedero 999999 no encontrado" }] }),
		);
		await vaciarColaOffline(client as unknown as ApolloClient);

		client.mutate.mockClear();
		await vaciarColaOffline(client as unknown as ApolloClient);
		expect(client.mutate).not.toHaveBeenCalled();
	});
});
