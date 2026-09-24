import { useState } from "react";
import type { FormEvent } from "react";
import { useMutation } from "@apollo/client/react";
import { Modal } from "../../components/ui/Modal";
import { Field } from "../../components/ui/Field";
import { TextInput } from "../../components/ui/TextInput";
import { Textarea } from "../../components/ui/Textarea";
import { Select } from "../../components/ui/Select";
import { Checkbox } from "../../components/ui/Checkbox";
import { Button } from "../../components/ui/Button";
import { Alert } from "../../components/ui/Alert";
import { PhotoUpload } from "../../components/ui/PhotoUpload";
import { SEXO_OPTIONS, ESTADO_CER_OPTIONS } from "../../lib/enums";
import { getErrorMessage } from "../../lib/graphqlErrors";
import { focusFirstInvalidField } from "../../lib/formValidation";
import type { FieldErrors } from "../../lib/formValidation";
import { CREATE_GATO_MUTATION, UPDATE_GATO_MUTATION } from "./gatos.graphql";
import { useColoniasLookup } from "../colonias/useColoniasLookup";
import { addGatoToColonia, removeGatoFromColonia } from "../colonias/coloniaCache";
import type { EstadoCer, Gato, Sexo } from "../../types/graphql";

interface FormState {
	coloniaId: string;
	nombre: string;
	sexo: Sexo | "";
	fechaNacimiento: string;
	capaPelaje: string;
	estadoCer: EstadoCer | "";
	tieneMicrochip: boolean;
	numMicrochip: string;
	marcajeOreja: boolean;
	fotoUrl: string | null;
	observaciones: string;
}

function toFormState(gato?: Gato, defaultColoniaId?: string): FormState {
	if (!gato) {
		return {
			coloniaId: defaultColoniaId ?? "",
			nombre: "",
			sexo: "",
			fechaNacimiento: "",
			capaPelaje: "",
			estadoCer: "",
			tieneMicrochip: false,
			numMicrochip: "",
			marcajeOreja: false,
			fotoUrl: null,
			observaciones: "",
		};
	}
	return {
		coloniaId: String(gato.coloniaId),
		nombre: gato.nombre ?? "",
		sexo: gato.sexo,
		fechaNacimiento: gato.fechaNacimiento ? gato.fechaNacimiento.slice(0, 10) : "",
		capaPelaje: gato.capaPelaje,
		estadoCer: gato.estadoCer,
		tieneMicrochip: gato.tieneMicrochip,
		numMicrochip: gato.numMicrochip ?? "",
		marcajeOreja: gato.marcajeOreja,
		fotoUrl: gato.fotoUrl,
		observaciones: gato.observaciones ?? "",
	};
}

interface GatoFormModalProps {
	open: boolean;
	onClose: () => void;
	gato?: Gato;
	defaultColoniaId?: string;
}

export function GatoFormModal({ open, onClose, gato, defaultColoniaId }: GatoFormModalProps) {
	const isEditing = Boolean(gato);
	const { colonias, loading: loadingColonias } = useColoniasLookup();
	const [form, setForm] = useState<FormState>(() => toFormState(gato, defaultColoniaId));
	const [error, setError] = useState<string | null>(null);
	const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

	// "Gatos" (por nombre) refresca cualquier listado plano activo - eso ya lo hace bien Apollo con
	// varios sitios a la vez. Lo que Apollo no hace solo es añadir/quitar el gato del array anidado
	// Colonia.gatos que usa ColoniaDetailPage - de eso se encargan los `update` de abajo,
	// directamente en la caché, sin una segunda petición de red.
	const [createGato, { loading: creating }] = useMutation<{ createGato: Gato }>(CREATE_GATO_MUTATION, {
		refetchQueries: ["Gatos"],
		update(cache, { data }) {
			if (data?.createGato) addGatoToColonia(cache, data.createGato);
		},
	});
	const [updateGato, { loading: updating }] = useMutation<{ updateGato: Gato }>(UPDATE_GATO_MUTATION, {
		refetchQueries: ["Gatos"],
		update(cache, { data }) {
			const actualizado = data?.updateGato;
			if (!actualizado) return;
			// Si se cambió de colonia hay que sacarlo del array de la antigua además de meterlo en
			// el de la nueva - si no cambió, esto último es un no-op (addGatoToColonia ya evita
			// duplicados).
			if (gato && gato.coloniaId !== actualizado.coloniaId) {
				removeGatoFromColonia(cache, gato.coloniaId, actualizado.id);
			}
			addGatoToColonia(cache, actualizado);
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
		if (!form.capaPelaje.trim()) errors.capaPelaje = "Indica la capa de pelaje.";
		if (!form.sexo) errors.sexo = "Selecciona el sexo.";
		if (!form.estadoCer) errors.estadoCer = "Selecciona el estado del protocolo CER.";
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
			nombre: form.nombre.trim() || undefined,
			sexo: form.sexo,
			fechaNacimiento: form.fechaNacimiento || undefined,
			capaPelaje: form.capaPelaje.trim(),
			estadoCer: form.estadoCer,
			tieneMicrochip: form.tieneMicrochip,
			numMicrochip: form.numMicrochip.trim() || undefined,
			marcajeOreja: form.marcajeOreja,
			fotoUrl: form.fotoUrl ?? undefined,
			observaciones: form.observaciones.trim() || undefined,
		};

		try {
			if (isEditing && gato) {
				await updateGato({ variables: { id: gato.id, data } });
			} else {
				await createGato({ variables: { data } });
			}
			onClose();
		} catch (err) {
			setError(getErrorMessage(err));
		}
	}

	return (
		<Modal open={open} onClose={handleClose} title={isEditing ? "Editar gato" : "Nuevo gato"} widthClassName="max-w-xl">
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

				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
					<Field label="Nombre" htmlFor="nombre" hint="Opcional si el gato no tiene nombre asignado">
						<TextInput id="nombre" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
					</Field>
					<Field label="Capa de pelaje" htmlFor="capaPelaje" required error={fieldErrors.capaPelaje}>
						<TextInput
							id="capaPelaje"
							required
							placeholder="Atigrado, negro, tricolor..."
							value={form.capaPelaje}
							onChange={(e) => setForm({ ...form, capaPelaje: e.target.value })}
						/>
					</Field>
				</div>

				<Field label="Fecha de nacimiento estimada" htmlFor="fechaNacimiento" hint="Opcional, aproximada">
					<TextInput
						id="fechaNacimiento"
						type="date"
						value={form.fechaNacimiento}
						onChange={(e) => setForm({ ...form, fechaNacimiento: e.target.value })}
					/>
				</Field>

				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
					<Field label="Sexo" htmlFor="sexo" required error={fieldErrors.sexo}>
						<Select id="sexo" required value={form.sexo} onChange={(e) => setForm({ ...form, sexo: e.target.value as Sexo })}>
							<option value="" disabled>
								Selecciona una opción
							</option>
							{SEXO_OPTIONS.map((option) => (
								<option key={option.value} value={option.value}>
									{option.label}
								</option>
							))}
						</Select>
					</Field>
					<Field label="Estado (protocolo CER)" htmlFor="estadoCer" required error={fieldErrors.estadoCer}>
						<Select
							id="estadoCer"
							required
							value={form.estadoCer}
							onChange={(e) => setForm({ ...form, estadoCer: e.target.value as EstadoCer })}
						>
							<option value="" disabled>
								Selecciona una opción
							</option>
							{ESTADO_CER_OPTIONS.map((option) => (
								<option key={option.value} value={option.value}>
									{option.label}
								</option>
							))}
						</Select>
					</Field>
				</div>

				<div className="flex gap-6">
					<Checkbox
						id="tieneMicrochip"
						label="Tiene microchip"
						checked={form.tieneMicrochip}
						onChange={(e) => setForm({ ...form, tieneMicrochip: e.target.checked })}
					/>
					<Checkbox
						id="marcajeOreja"
						label="Marcaje en la oreja"
						checked={form.marcajeOreja}
						onChange={(e) => setForm({ ...form, marcajeOreja: e.target.checked })}
					/>
				</div>

				<Field label="Número de microchip" htmlFor="numMicrochip" hint="Déjalo vacío si no se conoce">
					<TextInput
						id="numMicrochip"
						value={form.numMicrochip}
						onChange={(e) => setForm({ ...form, numMicrochip: e.target.value })}
					/>
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
