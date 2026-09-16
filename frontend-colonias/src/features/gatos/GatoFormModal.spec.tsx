import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MockedProvider } from "@apollo/client/testing/react";
import { GatoFormModal } from "./GatoFormModal";
import { COLONIAS_QUERY } from "../colonias/colonias.graphql";

const mocks = [
	{
		request: { query: COLONIAS_QUERY },
		result: { data: { colonias: [] } },
	},
];

describe("GatoFormModal", () => {
	it("enviar el formulario con la colonia vacía muestra el error esperado y no llama a ninguna mutación", async () => {
		const user = userEvent.setup();
		const onClose = vi.fn();
		render(
			<MockedProvider mocks={mocks}>
				<GatoFormModal open onClose={onClose} />
			</MockedProvider>,
		);

		// Espera a que termine de cargar colonias (el <select> deja de estar deshabilitado) antes
		// de rellenar el resto - si no, el formulario se envía en un estado intermedio distinto.
		await screen.findByRole("combobox", { name: /colonia/i });

		// Rellena todo MENOS la colonia, que es el campo que este test quiere aislar.
		await user.selectOptions(screen.getByLabelText(/^sexo/i), "HEMBRA");
		await user.type(screen.getByLabelText(/capa de pelaje/i), "Atigrado");
		await user.selectOptions(screen.getByLabelText(/estado \(protocolo cer\)/i), "AVISTADO");

		// No hay ningún mock de createGato/updateGato registrado a propósito: si el componente
		// intentara llamar a la mutación de todos modos, MockedProvider fallaría con "No more
		// mocked responses" en vez de con el mensaje de validación esperado.
		//
		// fireEvent.submit(form) en vez de user.click(botón "Guardar"): el <select> de colonia
		// tiene el atributo HTML `required`, y un clic real de usuario dispara primero la
		// validación nativa del navegador (jsdom la implementa) - el evento "submit" nunca llega
		// a dispatcharse, así que el handler de React ni se entera. Disparar el evento
		// directamente es lo que permite comprobar la validación propia de la app por debajo de
		// esa validación nativa del navegador.
		const form = screen.getByRole("button", { name: /guardar/i }).closest("form");
		if (!form) throw new Error("No se encontró el <form> del modal");
		fireEvent.submit(form);

		expect(
			await screen.findByText("Completa la colonia, el sexo, el estado y la capa de pelaje."),
		).toBeInTheDocument();
		expect(onClose).not.toHaveBeenCalled();
	});
});
