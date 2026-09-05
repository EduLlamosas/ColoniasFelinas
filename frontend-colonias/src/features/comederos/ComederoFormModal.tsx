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
import { CREATE_COMEDERO_MUTATION, UPDATE_COMEDERO_MUTATION } from "./comederos.graphql";
import { useColoniasLookup } from "../colonias/useColoniasLookup";
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

	const mutationOptions = { refetchQueries: ["Comederos"], awaitRefetchQueries: true };
	const [createComedero, { loading: creating }] = useMutation(CREATE_COMEDERO_MUTATION, mutationOptions);
	const [updateComedero, { loading: updating }] = useMutation(UPDATE_COMEDERO_MUTATION, mutationOptions);
	const saving = creating || updating;

	function handleClose() {
		setError(null);
		onClose();
	}

	async function handleSubmit(event: FormEvent) {
		event.preventDefault();
		setError(null);

		if (!form.coloniaId || !form.ubicacionDetallada.trim()) {
			setError("Completa la colonia y la ubicación del comedero.");
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
				<Field label="Colonia" htmlFor="coloniaId" required>
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
								{colonia.nombre} ({colonia.codigoOficial})
							</option>
						))}
					</Select>
				</Field>

				<Field label="Ubicación detallada" htmlFor="ubicacionDetallada" required>
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
