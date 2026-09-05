import { useState } from "react";
import type { FormEvent } from "react";
import { useMutation } from "@apollo/client/react";
import { Modal } from "../../components/ui/Modal";
import { Field } from "../../components/ui/Field";
import { TextInput } from "../../components/ui/TextInput";
import { Select } from "../../components/ui/Select";
import { Textarea } from "../../components/ui/Textarea";
import { Button } from "../../components/ui/Button";
import { Alert } from "../../components/ui/Alert";
import { PhotoUpload } from "../../components/ui/PhotoUpload";
import { LocationPicker } from "./LocationPicker";
import { TIPO_SUELO_OPTIONS } from "../../lib/enums";
import { getErrorMessage } from "../../lib/graphqlErrors";
import { COLONIAS_QUERY, CREATE_COLONIA_MUTATION, UPDATE_COLONIA_MUTATION } from "./colonias.graphql";
import type { Colonia, TipoSuelo } from "../../types/graphql";

interface FormState {
	codigoOficial: string;
	nombre: string;
	tipoSuelo: TipoSuelo | "";
	latitud: number | null;
	longitud: number | null;
	observaciones: string;
	fotoUrl: string | null;
}

function toFormState(colonia?: Colonia): FormState {
	if (!colonia) {
		return {
			codigoOficial: "",
			nombre: "",
			tipoSuelo: "",
			latitud: null,
			longitud: null,
			observaciones: "",
			fotoUrl: null,
		};
	}
	return {
		codigoOficial: colonia.codigoOficial,
		nombre: colonia.nombre,
		tipoSuelo: colonia.tipoSuelo,
		latitud: colonia.latitud,
		longitud: colonia.longitud,
		observaciones: colonia.observaciones ?? "",
		fotoUrl: colonia.fotoUrl,
	};
}

interface ColoniaFormModalProps {
	open: boolean;
	onClose: () => void;
	colonia?: Colonia;
}

export function ColoniaFormModal({ open, onClose, colonia }: ColoniaFormModalProps) {
	const isEditing = Boolean(colonia);
	const [form, setForm] = useState<FormState>(() => toFormState(colonia));
	const [error, setError] = useState<string | null>(null);

	const mutationOptions = { refetchQueries: [{ query: COLONIAS_QUERY }], awaitRefetchQueries: true };
	const [createColonia, { loading: creating }] = useMutation(CREATE_COLONIA_MUTATION, mutationOptions);
	const [updateColonia, { loading: updating }] = useMutation(UPDATE_COLONIA_MUTATION, mutationOptions);
	const saving = creating || updating;

	function handleOpenChange() {
		setForm(toFormState(colonia));
		setError(null);
		onClose();
	}

	async function handleSubmit(event: FormEvent) {
		event.preventDefault();
		setError(null);

		if (!form.tipoSuelo || form.latitud === null || form.longitud === null) {
			setError("Completa el tipo de suelo y la ubicación en el mapa.");
			return;
		}

		const data = {
			codigoOficial: form.codigoOficial.trim(),
			nombre: form.nombre.trim(),
			tipoSuelo: form.tipoSuelo,
			latitud: form.latitud,
			longitud: form.longitud,
			observaciones: form.observaciones.trim() || undefined,
			fotoUrl: form.fotoUrl ?? undefined,
		};

		try {
			if (isEditing && colonia) {
				await updateColonia({ variables: { id: colonia.id, data } });
			} else {
				await createColonia({ variables: { data } });
			}
			onClose();
		} catch (err) {
			setError(getErrorMessage(err));
		}
	}

	return (
		<Modal
			open={open}
			onClose={handleOpenChange}
			title={isEditing ? "Editar colonia" : "Nueva colonia"}
			widthClassName="max-w-xl"
		>
			<form onSubmit={handleSubmit} className="space-y-4">
				<div className="grid grid-cols-2 gap-4">
					<Field label="Código oficial" htmlFor="codigoOficial" required>
						<TextInput
							id="codigoOficial"
							required
							value={form.codigoOficial}
							onChange={(e) => setForm({ ...form, codigoOficial: e.target.value })}
						/>
					</Field>
					<Field label="Nombre" htmlFor="nombre" required>
						<TextInput
							id="nombre"
							required
							value={form.nombre}
							onChange={(e) => setForm({ ...form, nombre: e.target.value })}
						/>
					</Field>
				</div>

				<Field label="Tipo de suelo" htmlFor="tipoSuelo" required>
					<Select
						id="tipoSuelo"
						required
						value={form.tipoSuelo}
						onChange={(e) => setForm({ ...form, tipoSuelo: e.target.value as TipoSuelo })}
					>
						<option value="" disabled>
							Selecciona una opción
						</option>
						{TIPO_SUELO_OPTIONS.map((option) => (
							<option key={option.value} value={option.value}>
								{option.label}
							</option>
						))}
					</Select>
				</Field>

				<Field label="Ubicación" htmlFor="latitud" required>
					<LocationPicker
						latitud={form.latitud}
						longitud={form.longitud}
						onChange={(lat, lng) => setForm({ ...form, latitud: lat, longitud: lng })}
					/>
					<div className="mt-2 grid grid-cols-2 gap-4">
						<TextInput
							id="latitud"
							type="number"
							step="any"
							placeholder="Latitud"
							value={form.latitud ?? ""}
							onChange={(e) => setForm({ ...form, latitud: e.target.value === "" ? null : Number(e.target.value) })}
						/>
						<TextInput
							type="number"
							step="any"
							placeholder="Longitud"
							value={form.longitud ?? ""}
							onChange={(e) => setForm({ ...form, longitud: e.target.value === "" ? null : Number(e.target.value) })}
						/>
					</div>
				</Field>

				<Field label="Observaciones" htmlFor="observaciones">
					<Textarea
						id="observaciones"
						value={form.observaciones}
						onChange={(e) => setForm({ ...form, observaciones: e.target.value })}
					/>
				</Field>

				<PhotoUpload label="Foto" value={form.fotoUrl} onChange={(url) => setForm({ ...form, fotoUrl: url })} />

				{error && <Alert message={error} />}

				<div className="flex justify-end gap-2 pt-2">
					<Button type="button" variant="secondary" onClick={handleOpenChange} disabled={saving}>
						Cancelar
					</Button>
					<Button type="submit" loading={saving}>
						Guardar
					</Button>
				</div>
			</form>
		</Modal>
	);
}
