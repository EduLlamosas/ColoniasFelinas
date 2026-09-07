import { useState } from "react";
import type { FormEvent } from "react";
import { useMutation, useQuery } from "@apollo/client/react";
import { PlusIcon } from "@heroicons/react/24/outline";
import { Button } from "../../components/ui/Button";
import { Field } from "../../components/ui/Field";
import { TextInput } from "../../components/ui/TextInput";
import { Textarea } from "../../components/ui/Textarea";
import { Select } from "../../components/ui/Select";
import { Alert } from "../../components/ui/Alert";
import { EmptyState } from "../../components/ui/EmptyState";
import { ESTADO_CER_OPTIONS, TIPO_EVENTO_CLINICO_LABELS, TIPO_EVENTO_CLINICO_OPTIONS } from "../../lib/enums";
import { getErrorMessage } from "../../lib/graphqlErrors";
import {
	REGISTRAR_INTERVENCION_MEDICA_MUTATION,
	REGISTROS_CLINICOS_QUERY,
} from "./registros-clinicos.graphql";
import type { EstadoCer, RegistroClinico, TipoEventoClinico } from "../../types/graphql";

interface HistorialClinicoSectionProps {
	gatoId: number;
	estadoCerActual: EstadoCer;
}

// "Registrar Intervención Médica y Flujo CER" (Tabla 3.8): cada envío crea una tupla nueva del
// historial (no se edita ni se borra, es trazabilidad clínica inalterable) y, en la misma
// transacción del backend, actualiza el estado_cer del gato - por eso refrescamos también Gatos.
export function HistorialClinicoSection({ gatoId, estadoCerActual }: HistorialClinicoSectionProps) {
	const { data, loading, error } = useQuery<{ registrosClinicos: RegistroClinico[] }>(
		REGISTROS_CLINICOS_QUERY,
		{ variables: { gatoId } },
	);
	const [formOpen, setFormOpen] = useState(false);
	const [tipo, setTipo] = useState<TipoEventoClinico | "">("");
	const [fecha, setFecha] = useState("");
	const [diagnostico, setDiagnostico] = useState("");
	const [nuevoEstadoCer, setNuevoEstadoCer] = useState<EstadoCer>(estadoCerActual);
	const [formError, setFormError] = useState<string | null>(null);

	const [registrarIntervencion, { loading: saving }] = useMutation(
		REGISTRAR_INTERVENCION_MEDICA_MUTATION,
		{ refetchQueries: ["RegistrosClinicos", "Gatos"], awaitRefetchQueries: true },
	);

	function openForm() {
		setNuevoEstadoCer(estadoCerActual);
		setFormOpen(true);
	}

	async function handleSubmit(event: FormEvent) {
		event.preventDefault();
		setFormError(null);

		if (!tipo || !fecha || !diagnostico.trim()) {
			setFormError("Completa el tipo de evento, la fecha y el diagnóstico.");
			return;
		}

		try {
			await registrarIntervencion({
				variables: { data: { gatoId, tipo, fecha, diagnostico: diagnostico.trim(), nuevoEstadoCer } },
			});
			setTipo("");
			setFecha("");
			setDiagnostico("");
			setFormOpen(false);
		} catch (err) {
			setFormError(getErrorMessage(err));
		}
	}

	const registros = data?.registrosClinicos ?? [];

	return (
		<div className="mt-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
			<div className="mb-3 flex items-center justify-between">
				<h2 className="text-sm font-semibold text-slate-900">Historial clínico</h2>
				{!formOpen && (
					<Button variant="secondary" onClick={openForm}>
						<PlusIcon className="h-4 w-4" />
						Añadir registro médico
					</Button>
				)}
			</div>

			{formOpen && (
				<form onSubmit={handleSubmit} className="mb-4 space-y-3 rounded-md border border-slate-200 bg-slate-50 p-4">
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
						<Field label="Tipo de evento" htmlFor="tipo" required>
							<Select id="tipo" required value={tipo} onChange={(e) => setTipo(e.target.value as TipoEventoClinico)}>
								<option value="" disabled>
									Selecciona una opción
								</option>
								{TIPO_EVENTO_CLINICO_OPTIONS.map((option) => (
									<option key={option.value} value={option.value}>
										{option.label}
									</option>
								))}
							</Select>
						</Field>
						<Field label="Fecha" htmlFor="fecha" required>
							<TextInput id="fecha" type="date" required value={fecha} onChange={(e) => setFecha(e.target.value)} />
						</Field>
					</div>
					<Field label="Diagnóstico" htmlFor="diagnostico" required>
						<Textarea id="diagnostico" value={diagnostico} onChange={(e) => setDiagnostico(e.target.value)} />
					</Field>
					<Field label="Nuevo estado (protocolo CER)" htmlFor="nuevoEstadoCer" required>
						<Select
							id="nuevoEstadoCer"
							required
							value={nuevoEstadoCer}
							onChange={(e) => setNuevoEstadoCer(e.target.value as EstadoCer)}
						>
							{ESTADO_CER_OPTIONS.map((option) => (
								<option key={option.value} value={option.value}>
									{option.label}
								</option>
							))}
						</Select>
					</Field>
					{formError && <Alert message={formError} />}
					<div className="flex justify-end gap-2">
						<Button type="button" variant="secondary" onClick={() => setFormOpen(false)} disabled={saving}>
							Cancelar
						</Button>
						<Button type="submit" loading={saving}>
							Guardar
						</Button>
					</div>
				</form>
			)}

			{loading && <p className="text-sm text-slate-500">Cargando historial...</p>}
			{error && <Alert message={getErrorMessage(error)} />}
			{!loading && !error && registros.length === 0 && (
				<EmptyState title="Sin registros clínicos" description="Aún no se ha registrado ninguna intervención médica." />
			)}
			{registros.length > 0 && (
				<ul className="divide-y divide-slate-100 text-sm">
					{registros.map((registro) => (
						<li key={registro.id} className="flex flex-col gap-1 py-3">
							<div className="flex flex-wrap items-center justify-between gap-2">
								<span className="font-medium text-slate-800">{TIPO_EVENTO_CLINICO_LABELS[registro.tipo]}</span>
								<span className="text-xs text-slate-500">
									{new Date(registro.fecha).toLocaleDateString("es-ES")}
								</span>
							</div>
							<p className="text-slate-600">{registro.diagnostico}</p>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
