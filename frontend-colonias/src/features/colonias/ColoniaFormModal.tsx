import { useState } from "react";
import type { FormEvent } from "react";
import { useMutation, useQuery } from "@apollo/client/react";
import { Modal } from "../../components/ui/Modal";
import { Field } from "../../components/ui/Field";
import { TextInput } from "../../components/ui/TextInput";
import { Select } from "../../components/ui/Select";
import { Textarea } from "../../components/ui/Textarea";
import { Button } from "../../components/ui/Button";
import { Alert } from "../../components/ui/Alert";
import { PhotoUpload } from "../../components/ui/PhotoUpload";
import { Spinner } from "../../components/ui/Spinner";
import { LocationPicker } from "./LocationPicker";
import { TIPO_SUELO_OPTIONS } from "../../lib/enums";
import { getErrorMessage } from "../../lib/graphqlErrors";
import { fieldErrorId, focusFirstInvalidField } from "../../lib/formValidation";
import type { FieldErrors } from "../../lib/formValidation";
import { COLONIA_QUERY, COLONIAS_QUERY, CREATE_COLONIA_MUTATION, UPDATE_COLONIA_MUTATION } from "./colonias.graphql";
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
		codigoOficial: colonia.codigoOficial ?? "",
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
	// El listado (ColoniasListPage) solo carga los campos que muestra en tabla/mapa - no trae
	// "observaciones" ni las fechas. Para editar hacen falta todos los campos, así que este modal
	// los pide por su cuenta con COLONIA_QUERY en vez de fiarse de lo que el listado ya tenga en
	// memoria (evita que "observaciones" se pierda al guardar si el modal se abrió desde la lista).
	coloniaId?: string;
}

export function ColoniaFormModal({ open, onClose, coloniaId }: ColoniaFormModalProps) {
	const isEditing = Boolean(coloniaId);
	const { data: coloniaData, loading: loadingColonia } = useQuery<{ colonia: Colonia }>(COLONIA_QUERY, {
		variables: { id: coloniaId },
		skip: !coloniaId,
	});
	const colonia = coloniaData?.colonia;
	const [form, setForm] = useState<FormState>(() => toFormState(colonia));
	const [error, setError] = useState<string | null>(null);
	const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

	// El formulario se crea antes de que la consulta resuelva (coloniaId ya fijado, colonia
	// todavía undefined) - en cuanto llegan los datos hay que rellenar el formulario con ellos, PERO
	// solo esa primera vez: si se comparase por referencia (colonia !== algo), cualquier escritura
	// posterior en la misma entidad normalizada Colonia:<id> mientras el modal sigue abierto (otra
	// pestaña, otra mutación con refetchQueries que la toque) haría que Apollo entregase un objeto
	// `colonia` nuevo y esto pisaría en silencio lo que el usuario ya hubiera escrito sin guardar.
	// Se ajusta en el propio render (patrón de React) en vez de un useEffect, para no disparar un
	// repintado de más.
	const [formSincronizado, setFormSincronizado] = useState(false);
	if (colonia && !formSincronizado) {
		setFormSincronizado(true);
		setForm(toFormState(colonia));
	}

	const mutationOptions = { refetchQueries: [{ query: COLONIAS_QUERY }], awaitRefetchQueries: true };
	const [createColonia, { loading: creating }] = useMutation(CREATE_COLONIA_MUTATION, mutationOptions);
	const [updateColonia, { loading: updating }] = useMutation(UPDATE_COLONIA_MUTATION, mutationOptions);
	const saving = creating || updating;

	function handleOpenChange() {
		setForm(toFormState(colonia));
		setError(null);
		setFieldErrors({});
		onClose();
	}

	function validate(): FieldErrors {
		const errors: FieldErrors = {};
		if (!form.tipoSuelo) errors.tipoSuelo = "Selecciona el tipo de suelo.";
		if (form.latitud === null || form.longitud === null) {
			errors.latitud = "Selecciona una ubicación en el mapa.";
		}
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
			codigoOficial: form.codigoOficial.trim() || undefined,
			nombre: form.nombre.trim(),
			tipoSuelo: form.tipoSuelo,
			latitud: form.latitud,
			longitud: form.longitud,
			observaciones: form.observaciones.trim() || undefined,
			fotoUrl: form.fotoUrl ?? undefined,
		};

		try {
			if (isEditing && coloniaId) {
				await updateColonia({ variables: { id: coloniaId, data } });
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
			{loadingColonia && !colonia ? (
				<div className="flex justify-center py-10">
					<Spinner size="lg" />
				</div>
			) : (
			<form onSubmit={handleSubmit} className="space-y-4">
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
					<Field
						label="Código oficial"
						htmlFor="codigoOficial"
						hint="Lo asigna el ayuntamiento; puedes dejarlo vacío mientras se tramita"
					>
						<TextInput
							id="codigoOficial"
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

				<Field label="Tipo de suelo" htmlFor="tipoSuelo" required error={fieldErrors.tipoSuelo}>
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

				<Field label="Ubicación" htmlFor="latitud" required error={fieldErrors.latitud}>
					<LocationPicker
						latitud={form.latitud}
						longitud={form.longitud}
						onChange={(lat, lng) => setForm({ ...form, latitud: lat, longitud: lng })}
					/>
					<div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-2">
						<TextInput
							id="latitud"
							type="number"
							step="any"
							placeholder="Latitud"
							aria-invalid={fieldErrors.latitud ? true : undefined}
							aria-describedby={fieldErrors.latitud ? fieldErrorId("latitud") : undefined}
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
			)}
		</Modal>
	);
}
