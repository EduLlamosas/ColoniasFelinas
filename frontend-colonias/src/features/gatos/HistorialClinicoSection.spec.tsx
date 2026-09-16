import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MockedProvider } from "@apollo/client/testing/react";
import { HistorialClinicoSection } from "./HistorialClinicoSection";
import { REGISTRAR_INTERVENCION_MEDICA_MUTATION, REGISTROS_CLINICOS_QUERY } from "./registros-clinicos.graphql";
import { GATOS_QUERY } from "./gatos.graphql";

const GATO_ID = 42;

// El propio contrato de MockedProvider es la aserción: si RegistrarIntervencionMedica se llama
// con unas variables que no coinciden EXACTAMENTE con las de este mock, Apollo no encuentra
// respuesta y la mutación falla con "No more mocked responses" - que el formulario se cierre
// sin error es, en sí mismo, la prueba de que los campos enviados son los correctos.
function buildMocks() {
	return [
		{
			request: { query: REGISTROS_CLINICOS_QUERY, variables: { gatoId: GATO_ID } },
			result: { data: { registrosClinicos: [] } },
		},
		{
			request: {
				query: REGISTRAR_INTERVENCION_MEDICA_MUTATION,
				variables: {
					data: {
						gatoId: GATO_ID,
						tipo: "VACUNACION",
						fecha: "2026-01-15",
						diagnostico: "Vacuna anual",
						nuevoEstadoCer: "CAPTURADO",
					},
				},
			},
			result: {
				data: {
					registrarIntervencionMedica: {
						id: "1",
						gatoId: GATO_ID,
						usuarioId: 1,
						usuario: { id: "1", nombreCompleto: "Gestor de prueba" },
						tipo: "VACUNACION",
						fecha: "2026-01-15",
						diagnostico: "Vacuna anual",
						createdAt: "2026-01-15T00:00:00.000Z",
					},
				},
			},
		},
		// awaitRefetchQueries: true dispara estas dos por nombre tras la mutación (ver
		// HistorialClinicoSection.tsx) - sin mocks para ellas, Apollo se queda sin respuesta.
		{
			request: { query: REGISTROS_CLINICOS_QUERY, variables: { gatoId: GATO_ID } },
			result: {
				data: {
					registrosClinicos: [
						{
							id: "1",
							gatoId: GATO_ID,
							usuarioId: 1,
							usuario: { id: "1", nombreCompleto: "Gestor de prueba" },
							tipo: "VACUNACION",
							fecha: "2026-01-15",
							diagnostico: "Vacuna anual",
							createdAt: "2026-01-15T00:00:00.000Z",
						},
					],
				},
			},
		},
		{
			request: { query: GATOS_QUERY },
			result: { data: { gatos: [] } },
		},
	];
}

describe("HistorialClinicoSection", () => {
	it("registra una intervención médica llamando a la mutación con los campos correctos", async () => {
		const user = userEvent.setup();
		render(
			<MockedProvider mocks={buildMocks()}>
				<HistorialClinicoSection gatoId={GATO_ID} estadoCerActual="CAPTURADO" />
			</MockedProvider>,
		);

		await screen.findByText("Sin registros clínicos");

		await user.click(screen.getByRole("button", { name: /añadir registro médico/i }));

		await user.selectOptions(screen.getByLabelText(/tipo de evento/i), "VACUNACION");
		await user.type(screen.getByLabelText(/fecha/i), "2026-01-15");
		await user.type(screen.getByLabelText(/diagnóstico/i), "Vacuna anual");
		// nuevoEstadoCer se deja tal cual: ya viene preseleccionado a estadoCerActual ("CAPTURADO").

		await user.click(screen.getByRole("button", { name: /^guardar$/i }));

		// Si la mutación se hubiera llamado con variables distintas a las del mock, esto no
		// llegaría a pasar: el formulario seguiría abierto con el error de red del mock sin usar.
		await screen.findByRole("button", { name: /añadir registro médico/i });
		expect(screen.queryByLabelText(/diagnóstico/i)).not.toBeInTheDocument();
	});
});
