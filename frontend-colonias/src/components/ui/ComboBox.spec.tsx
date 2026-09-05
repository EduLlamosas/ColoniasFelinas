import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ComboBox } from "./ComboBox";

function ControlledComboBox({ options, onChange }: { options: string[]; onChange?: (value: string) => void }) {
	const [value, setValue] = useState("");
	return (
		<ComboBox
			options={options}
			value={value}
			onChange={(next) => {
				setValue(next);
				onChange?.(next);
			}}
		/>
	);
}

describe("ComboBox", () => {
	it("permite escribir un valor que no está en las opciones", async () => {
		const user = userEvent.setup();
		const onChange = vi.fn();
		render(<ControlledComboBox options={["Supervisor", "Capturador"]} onChange={onChange} />);

		const input = screen.getByRole("combobox");
		await user.type(input, "Veterinaria");

		expect(input).toHaveValue("Veterinaria");
		expect(onChange).toHaveBeenLastCalledWith("Veterinaria");
	});

	it("filtra las opciones mostradas según lo escrito", async () => {
		const user = userEvent.setup();
		render(<ControlledComboBox options={["Supervisor", "Capturador", "Alimentador principal"]} />);

		const input = screen.getByRole("combobox");
		await user.type(input, "sup");

		expect(await screen.findByText("Supervisor")).toBeInTheDocument();
		expect(screen.queryByText("Capturador")).not.toBeInTheDocument();
		expect(screen.queryByText("Alimentador principal")).not.toBeInTheDocument();
	});

	it("ofrece la opción de usar el texto escrito cuando no coincide con ninguna sugerencia", async () => {
		const user = userEvent.setup();
		render(<ControlledComboBox options={["Supervisor"]} />);

		const input = screen.getByRole("combobox");
		await user.type(input, "Veterinaria");

		expect(await screen.findByText("Usar «Veterinaria»")).toBeInTheDocument();
	});

	it("no ofrece 'usar el texto escrito' cuando coincide exactamente con una opción existente", async () => {
		const user = userEvent.setup();
		render(<ControlledComboBox options={["Supervisor"]} />);

		const input = screen.getByRole("combobox");
		await user.type(input, "Supervisor");

		expect(screen.queryByText('Usar «Supervisor»')).not.toBeInTheDocument();
	});

	it("selecciona una opción existente al hacer click", async () => {
		const user = userEvent.setup();
		const onChange = vi.fn();
		render(<ControlledComboBox options={["Supervisor", "Capturador"]} onChange={onChange} />);

		const input = screen.getByRole("combobox");
		await user.click(screen.getByRole("button"));
		await user.click(await screen.findByText("Capturador"));

		expect(input).toHaveValue("Capturador");
		expect(onChange).toHaveBeenLastCalledWith("Capturador");
	});
});
