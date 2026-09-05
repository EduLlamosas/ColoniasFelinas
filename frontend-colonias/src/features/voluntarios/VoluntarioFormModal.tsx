import { useState } from "react";
import type { FormEvent } from "react";
import { useMutation } from "@apollo/client/react";
import { Modal } from "../../components/ui/Modal";
import { Field } from "../../components/ui/Field";
import { TextInput } from "../../components/ui/TextInput";
import { Button } from "../../components/ui/Button";
import { Alert } from "../../components/ui/Alert";
import { PhotoUpload } from "../../components/ui/PhotoUpload";
import { getErrorMessage } from "../../lib/graphqlErrors";
import { CREATE_VOLUNTARIO_MUTATION, UPDATE_VOLUNTARIO_MUTATION } from "./voluntarios.graphql";
import type { Voluntario } from "../../types/graphql";

const DNI_PATTERN = /^\d{8}[A-Za-z]$/;

interface FormState {
	dni: string;
	nombre: string;
	telefono: string;
	urlCesionDatos: string | null;
}

function toFormState(voluntario?: Voluntario): FormState {
	if (!voluntario) {
		return { dni: "", nombre: "", telefono: "", urlCesionDatos: null };
	}
	return {
		dni: voluntario.dni,
		nombre: voluntario.nombre,
		telefono: voluntario.telefono ?? "",
		urlCesionDatos: voluntario.urlCesionDatos,
	};
}

interface VoluntarioFormModalProps {
	open: boolean;
	onClose: () => void;
	voluntario?: Voluntario;
}

export function VoluntarioFormModal({ open, onClose, voluntario }: VoluntarioFormModalProps) {
	const isEditing = Boolean(voluntario);
	const [form, setForm] = useState<FormState>(() => toFormState(voluntario));
	const [error, setError] = useState<string | null>(null);

	const mutationOptions = { refetchQueries: ["Voluntarios"], awaitRefetchQueries: true };
	const [createVoluntario, { loading: creating }] = useMutation(CREATE_VOLUNTARIO_MUTATION, mutationOptions);
	const [updateVoluntario, { loading: updating }] = useMutation(UPDATE_VOLUNTARIO_MUTATION, mutationOptions);
	const saving = creating || updating;

	function handleClose() {
		setError(null);
		onClose();
	}

	async function handleSubmit(event: FormEvent) {
		event.preventDefault();
		setError(null);

		if (!DNI_PATTERN.test(form.dni.trim())) {
			setError("El DNI debe tener 8 dígitos seguidos de una letra.");
			return;
		}
		if (!form.nombre.trim()) {
			setError("El nombre es obligatorio.");
			return;
		}
		if (!form.urlCesionDatos) {
			setError(
				"La Ley 7/2023 y el RGPD exigen el documento de cesión de datos firmado antes de dar de alta al voluntario.",
			);
			return;
		}

		const data = {
			dni: form.dni.trim(),
			nombre: form.nombre.trim(),
			telefono: form.telefono.trim() || undefined,
			urlCesionDatos: form.urlCesionDatos,
		};

		try {
			if (isEditing && voluntario) {
				await updateVoluntario({ variables: { id: voluntario.id, data } });
			} else {
				await createVoluntario({ variables: { data } });
			}
			onClose();
		} catch (err) {
			setError(getErrorMessage(err));
		}
	}

	return (
		<Modal open={open} onClose={handleClose} title={isEditing ? "Editar voluntario" : "Nuevo voluntario"}>
			<form onSubmit={handleSubmit} className="space-y-4">
				<div className="grid grid-cols-2 gap-4">
					<Field label="DNI" htmlFor="dni" required hint="8 dígitos y una letra">
						<TextInput
							id="dni"
							required
							placeholder="12345678A"
							value={form.dni}
							onChange={(e) => setForm({ ...form, dni: e.target.value })}
						/>
					</Field>
					<Field label="Teléfono" htmlFor="telefono">
						<TextInput
							id="telefono"
							value={form.telefono}
							onChange={(e) => setForm({ ...form, telefono: e.target.value })}
						/>
					</Field>
				</div>

				<Field label="Nombre" htmlFor="nombre" required>
					<TextInput id="nombre" required value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
				</Field>

				<PhotoUpload
					label="Documento de cesión de datos (RGPD)"
					value={form.urlCesionDatos}
					onChange={(url) => setForm({ ...form, urlCesionDatos: url })}
				/>
				<p className="-mt-2 text-xs text-slate-500">
					Obligatorio: foto o escaneo de la firma de cesión de datos. Sin este documento no se pueden tratar los
					datos del voluntario.
				</p>

				{error && <Alert message={error} />}

				<div className="flex justify-end gap-2 pt-2">
					<Button type="button" variant="secondary" onClick={handleClose} disabled={saving}>
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
