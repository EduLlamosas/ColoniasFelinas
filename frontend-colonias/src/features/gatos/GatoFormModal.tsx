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
import { CREATE_GATO_MUTATION, UPDATE_GATO_MUTATION } from "./gatos.graphql";
import { useColoniasLookup } from "../colonias/useColoniasLookup";
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

	const mutationOptions = { refetchQueries: ["Gatos"], awaitRefetchQueries: true };
	const [createGato, { loading: creating }] = useMutation(CREATE_GATO_MUTATION, mutationOptions);
	const [updateGato, { loading: updating }] = useMutation(UPDATE_GATO_MUTATION, mutationOptions);
	const saving = creating || updating;

	function handleClose() {
		setError(null);
		onClose();
	}

	async function handleSubmit(event: FormEvent) {
		event.preventDefault();
		setError(null);

		if (!form.coloniaId || !form.sexo || !form.estadoCer || !form.capaPelaje.trim()) {
			setError("Completa la colonia, el sexo, el estado y la capa de pelaje.");
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

				<div className="grid grid-cols-2 gap-4">
					<Field label="Nombre" htmlFor="nombre" hint="Opcional si el gato no tiene nombre asignado">
						<TextInput id="nombre" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
					</Field>
					<Field label="Capa de pelaje" htmlFor="capaPelaje" required>
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

				<div className="grid grid-cols-2 gap-4">
					<Field label="Sexo" htmlFor="sexo" required>
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
					<Field label="Estado (protocolo CER)" htmlFor="estadoCer" required>
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
