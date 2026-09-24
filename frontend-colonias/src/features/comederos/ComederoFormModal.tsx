import { useState } from "react";
import type { FormEvent } from "react";
import { useMutation } from "@apollo/client/react";
import { Modal } from "../../components/ui/Modal";
import { Field } from "../../components/ui/Field";
import { TextInput } from "../../components/ui/TextInput";
import { Select } from "../../components/ui/Select";
import { Button } from "../../components/ui/Button";
import { Alert } from "../../components/ui/Alert";
import { PhotoUpload } from "../../components/ui/PhotoUpload";
import { getErrorMessage } from "../../lib/graphqlErrors";
import { focusFirstInvalidField } from "../../lib/formValidation";
import type { FieldErrors } from "../../lib/formValidation";
import { CREATE_COMEDERO_MUTATION, UPDATE_COMEDERO_MUTATION } from "./comederos.graphql";
import { useColoniasLookup } from "../colonias/useColoniasLookup";
import { addComederoToColonia, removeComederoFromColonia } from "../colonias/coloniaCache";
import type { Comedero } from "../../types/graphql";

interface FormState {
	coloniaId: string;
	ubicacionDetallada: string;
	fotoUrl: string | null;
}

function toFormState(comedero?: Comedero, defaultColoniaId?: string): FormState {
	if (!comedero) {
		return { coloniaId: defaultColoniaId ?? "", ubicacionDetallada: "", fotoUrl: null };
	}
	return {
		coloniaId: String(comedero.coloniaId),
		ubicacionDetallada: comedero.ubicacionDetallada,
		fotoUrl: comedero.fotoUrl,
	};
}

interface ComederoFormModalProps {
	open: boolean;
	onClose: () => void;
	comedero?: Comedero;
	defaultColoniaId?: string;
}

export function ComederoFormModal({ open, onClose, comedero, defaultColoniaId }: ComederoFormModalProps) {
	const isEditing = Boolean(comedero);
	const { colonias, loading: loadingColonias } = useColoniasLookup();
	const [form, setForm] = useState<FormState>(() => toFormState(comedero, defaultColoniaId));
	const [error, setError] = useState<string | null>(null);
	const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

	const [createComedero, { loading: creating }] = useMutation<{ createComedero: Comedero }>(
		CREATE_COMEDERO_MUTATION,
		{
			refetchQueries: ["Comederos"],
			update(cache, { data }) {
				if (data?.createComedero) addComederoToColonia(cache, data.createComedero);
			},
		},
	);
	const [updateComedero, { loading: updating }] = useMutation<{ updateComedero: Comedero }>(UPDATE_COMEDERO_MUTATION, {
		refetchQueries: ["Comederos"],
		update(cache, { data }) {
			const actualizado = data?.updateComedero;
			if (!actualizado) return;
			if (comedero && comedero.coloniaId !== actualizado.coloniaId) {
				removeComederoFromColonia(cache, comedero.coloniaId, actualizado.id);
			}
			addComederoToColonia(cache, actualizado);
		},
	});
	const saving = creating || updating;

	function handleClose() {
		setError(null);
		setFieldErrors({});
		onClose();
	}

	function validate(): FieldErrors {
		const errors: FieldErrors = {};
		if (!form.coloniaId) errors.coloniaId = "Selecciona una colonia.";
		if (!form.ubicacionDetallada.trim()) errors.ubicacionDetallada = "Indica la ubicación del comedero.";
		return errors;
	}

	async function handleSubmit(event: FormEvent) {
		event.preventDefault();
		setError(null);

		const errors = validate();
		setFieldErrors(errors);
		if (Object.keys(errors).length > 0) {
			focusFirstInvalidField(errors);
			return;
		}

		const data = {
			coloniaId: Number(form.coloniaId),
			ubicacionDetallada: form.ubicacionDetallada.trim(),
			fotoUrl: form.fotoUrl ?? undefined,
		};

		try {
			if (isEditing && comedero) {
				await updateComedero({ variables: { id: comedero.id, data } });
			} else {
				await createComedero({ variables: { data } });
			}
			onClose();
		} catch (err) {
			setError(getErrorMessage(err));
		}
	}

	return (
		<Modal open={open} onClose={handleClose} title={isEditing ? "Editar comedero" : "Nuevo comedero"}>
			<form onSubmit={handleSubmit} className="space-y-4">
				<Field label="Colonia" htmlFor="coloniaId" required error={fieldErrors.coloniaId}>
					<Select
						id="coloniaId"
						required
						disabled={loadingColonias}
						value={form.coloniaId}
						onChange={(e) => setForm({ ...form, coloniaId: e.target.value })}
					>
						<option value="" disabled>
							Selecciona una colonia
						</option>
						{colonias.map((colonia) => (
							<option key={colonia.id} value={colonia.id}>
								{colonia.nombre}
								{colonia.codigoOficial ? ` (${colonia.codigoOficial})` : ""}
							</option>
						))}
					</Select>
				</Field>

				<Field label="Ubicación detallada" htmlFor="ubicacionDetallada" required error={fieldErrors.ubicacionDetallada}>
					<TextInput
						id="ubicacionDetallada"
						required
						placeholder="Junto al contenedor azul, esquina calle..."
						value={form.ubicacionDetallada}
						onChange={(e) => setForm({ ...form, ubicacionDetallada: e.target.value })}
					/>
				</Field>

				<PhotoUpload label="Foto" value={form.fotoUrl} onChange={(url) => setForm({ ...form, fotoUrl: url })} />

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
