import { useState } from "react";
import type { FormEvent } from "react";
import { useMutation, useQuery } from "@apollo/client/react";
import { Modal } from "../../components/ui/Modal";
import { Field } from "../../components/ui/Field";
import { Select } from "../../components/ui/Select";
import { ComboBox } from "../../components/ui/ComboBox";
import { Button } from "../../components/ui/Button";
import { Alert } from "../../components/ui/Alert";
import { getErrorMessage } from "../../lib/graphqlErrors";
import { focusFirstInvalidField } from "../../lib/formValidation";
import type { FieldErrors } from "../../lib/formValidation";
import { ASIGNACIONES_QUERY, CREATE_ASIGNACION_MUTATION, UPDATE_ASIGNACION_MUTATION } from "./asignaciones.graphql";
import { VOLUNTARIOS_QUERY } from "../voluntarios/voluntarios.graphql";
import { useColoniasLookup } from "../colonias/useColoniasLookup";
import { addAsignacionToColonia } from "../colonias/coloniaCache";
import type { Asignacion, Voluntario } from "../../types/graphql";

interface FormState {
	voluntarioId: string;
	coloniaId: string;
	rolAsignado: string;
}

function toFormState(asignacion?: Asignacion, defaultColoniaId?: string, defaultVoluntarioId?: string): FormState {
	if (!asignacion) {
		return { voluntarioId: defaultVoluntarioId ?? "", coloniaId: defaultColoniaId ?? "", rolAsignado: "" };
	}
	return {
		voluntarioId: String(asignacion.voluntarioId),
		coloniaId: String(asignacion.coloniaId),
		rolAsignado: asignacion.rolAsignado,
	};
}

interface AsignacionFormModalProps {
	open: boolean;
	onClose: () => void;
	asignacion?: Asignacion;
	defaultColoniaId?: string;
	defaultVoluntarioId?: string;
}

export function AsignacionFormModal({
	open,
	onClose,
	asignacion,
	defaultColoniaId,
	defaultVoluntarioId,
}: AsignacionFormModalProps) {
	const isEditing = Boolean(asignacion);
	const { colonias, loading: loadingColonias } = useColoniasLookup();
	const { data: voluntariosData, loading: loadingVoluntarios } = useQuery<{ voluntarios: Voluntario[] }>(
		VOLUNTARIOS_QUERY,
	);
	const voluntarios = voluntariosData?.voluntarios ?? [];
	const { data: asignacionesData } = useQuery<{ asignaciones: Asignacion[] }>(ASIGNACIONES_QUERY);
	const rolSugerencias = Array.from(
		new Set([ ...(asignacionesData?.asignaciones.map((a) => a.rolAsignado) ?? [])]),
	).sort((a, b) => a.localeCompare(b));
	const [form, setForm] = useState<FormState>(() => toFormState(asignacion, defaultColoniaId, defaultVoluntarioId));
	const [error, setError] = useState<string | null>(null);
	const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

	// updateAsignacion nunca cambia voluntarioId/coloniaId (es su clave compuesta, fija) - Apollo
	// actualiza sola la entidad normalizada en cualquier sitio donde esté embebida, sin necesitar
	// un `update` aquí. Crear sí hace falta añadirlo al array de la colonia a mano.
	const [createAsignacion, { loading: creating }] = useMutation<{ createAsignacion: Asignacion }>(
		CREATE_ASIGNACION_MUTATION,
		{
			refetchQueries: ["Asignaciones"],
			update(cache, { data }) {
				if (data?.createAsignacion) addAsignacionToColonia(cache, data.createAsignacion);
			},
		},
	);
	const [updateAsignacion, { loading: updating }] = useMutation(UPDATE_ASIGNACION_MUTATION, {
		refetchQueries: ["Asignaciones"],
	});
	const saving = creating || updating;

	function handleClose() {
		setError(null);
		setFieldErrors({});
		onClose();
	}

	function validate(): FieldErrors {
		const errors: FieldErrors = {};
		if (!form.voluntarioId) errors.voluntarioId = "Selecciona un voluntario.";
		if (!form.coloniaId) errors.coloniaId = "Selecciona una colonia.";
		if (!form.rolAsignado.trim()) errors.rolAsignado = "Indica el rol asignado.";
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

		try {
			const rolAsignado = form.rolAsignado.trim();
			if (isEditing && asignacion) {
				await updateAsignacion({
					variables: {
						voluntarioId: asignacion.voluntarioId,
						coloniaId: asignacion.coloniaId,
						data: { rolAsignado },
					},
				});
			} else {
				await createAsignacion({
					variables: {
						data: { voluntarioId: Number(form.voluntarioId), coloniaId: Number(form.coloniaId), rolAsignado },
					},
				});
			}
			onClose();
		} catch (err) {
			setError(getErrorMessage(err));
		}
	}

	return (
		<Modal open={open} onClose={handleClose} title={isEditing ? "Editar asignación" : "Nueva asignación"}>
			<form onSubmit={handleSubmit} className="space-y-4">
				<Field label="Voluntario" htmlFor="voluntarioId" required error={fieldErrors.voluntarioId}>
					<Select
						id="voluntarioId"
						required
						disabled={loadingVoluntarios || isEditing}
						value={form.voluntarioId}
						onChange={(e) => setForm({ ...form, voluntarioId: e.target.value })}
					>
						<option value="" disabled>
							Selecciona un voluntario
						</option>
						{voluntarios.map((voluntario) => (
							<option key={voluntario.id} value={voluntario.id}>
								{voluntario.nombre} ({voluntario.dni})
							</option>
						))}
					</Select>
				</Field>

				<Field label="Colonia" htmlFor="coloniaId" required error={fieldErrors.coloniaId}>
					<Select
						id="coloniaId"
						required
						disabled={loadingColonias || isEditing}
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

				<Field label="Rol asignado" htmlFor="rolAsignado" required error={fieldErrors.rolAsignado}>
					<ComboBox
						id="rolAsignado"
						required
						options={rolSugerencias}
						placeholder="Escribe o elige un rol (p. ej. Alimentador principal)"
						value={form.rolAsignado}
						onChange={(rolAsignado) => setForm({ ...form, rolAsignado })}
					/>
				</Field>

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
