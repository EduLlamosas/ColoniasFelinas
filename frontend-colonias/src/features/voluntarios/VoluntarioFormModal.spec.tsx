import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MockedProvider } from "@apollo/client/testing/react";
import { VoluntarioFormModal } from "./VoluntarioFormModal";

// Sin mocks: si el formulario intentara llamar a createVoluntario/updateVoluntario de todos
// modos, MockedProvider fallaría con "No more mocked responses" en vez de con la validación
// esperada - la propia ausencia de mocks es parte de la aserción.
describe("VoluntarioFormModal", () => {
	it("con DNI y nombre válidos pero sin documento de cesión, mueve el foco al campo de la foto", async () => {
		const user = userEvent.setup();
		const onClose = vi.fn();
		render(
			<MockedProvider mocks={[]}>
				<VoluntarioFormModal open onClose={onClose} />
			</MockedProvider>,
		);

		await user.type(screen.getByLabelText(/dni/i), "12345678A");
		await user.type(screen.getByLabelText(/nombre/i), "Ana Pérez");

		// fireEvent.submit(form) en vez de un clic real: DNI y nombre llevan `required` nativo y,
		// al estar ya rellenos, no bloquean el submit - pero se mantiene el mismo patrón que el
		// resto de tests del proyecto para no depender de si jsdom decide interceptar el evento.
		const form = screen.getByRole("button", { name: /guardar/i }).closest("form");
		if (!form) throw new Error("No se encontró el <form> del modal");
		fireEvent.submit(form);

		const error = await screen.findByText(
			"La Ley 7/2023 y el RGPD exigen el documento de cesión de datos firmado antes de dar de alta al voluntario.",
		);
		expect(error).toBeInTheDocument();

		// El input de archivo está oculto visualmente (sr-only) pero debe seguir siendo enfocable
		// y llevar la asociación aria-describedby -> el <p> del error, para que un lector de
		// pantalla anuncie qué falló al recibir el foco.
		const fileInput = document.getElementById("urlCesionDatos");
		expect(fileInput).not.toBeNull();
		expect(fileInput).toHaveAttribute("aria-invalid", "true");
		expect(fileInput).toHaveAttribute("aria-describedby", error.id);
		expect(fileInput).toHaveFocus();
		expect(onClose).not.toHaveBeenCalled();
	});
});
