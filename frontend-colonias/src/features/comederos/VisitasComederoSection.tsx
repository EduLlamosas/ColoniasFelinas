import { useState } from "react";
import type { FormEvent } from "react";
import { useMutation, useQuery } from "@apollo/client/react";
import { PlusIcon } from "@heroicons/react/24/outline";
import { Button } from "../../components/ui/Button";
import { Field } from "../../components/ui/Field";
import { Textarea } from "../../components/ui/Textarea";
import { Checkbox } from "../../components/ui/Checkbox";
import { Alert } from "../../components/ui/Alert";
import { EmptyState } from "../../components/ui/EmptyState";
import { getErrorMessage } from "../../lib/graphqlErrors";
import {
	REGISTRAR_VISITA_COMEDERO_MUTATION,
	VISITAS_COMEDERO_QUERY,
} from "./visitas-comedero.graphql";
import type { VisitaComedero } from "../../types/graphql";

interface VisitasComederoSectionProps {
	comederoId: number;
}

// "Registrar evento de alimentación / inspección" (Tabla 3.7): la traza queda fijada al
// insertarse (fecha capturada por el propio servidor) y no se puede editar ni borrar desde
// aquí, a propósito - es un registro de auditoría, no un dato de ficha modificable.
export function VisitasComederoSection({ comederoId }: VisitasComederoSectionProps) {
	const { data, loading, error } = useQuery<{ visitasComedero: VisitaComedero[] }>(
		VISITAS_COMEDERO_QUERY,
		{ variables: { comederoId } },
	);
	const [formOpen, setFormOpen] = useState(false);
	const [piensoSeco, setPiensoSeco] = useState(false);
	const [comidaHumeda, setComidaHumeda] = useState(false);
	const [agua, setAgua] = useState(false);
	const [observaciones, setObservaciones] = useState("");
	const [formError, setFormError] = useState<string | null>(null);

	const [registrarVisita, { loading: saving }] = useMutation(REGISTRAR_VISITA_COMEDERO_MUTATION, {
		refetchQueries: ["VisitasComedero", "Comederos"],
		awaitRefetchQueries: true,
	});

	async function handleSubmit(event: FormEvent) {
		event.preventDefault();
		setFormError(null);
		try {
			await registrarVisita({
				variables: {
					data: { comederoId, piensoSeco, comidaHumeda, agua, observaciones: observaciones.trim() || undefined },
				},
			});
			setPiensoSeco(false);
			setComidaHumeda(false);
			setAgua(false);
			setObservaciones("");
			setFormOpen(false);
		} catch (err) {
			setFormError(getErrorMessage(err));
		}
	}

	const visitas = data?.visitasComedero ?? [];

	return (
		<div className="mt-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
			<div className="mb-3 flex items-center justify-between">
				<h2 className="text-sm font-semibold text-slate-900">Visitas registradas</h2>
				{!formOpen && (
					<Button variant="secondary" onClick={() => setFormOpen(true)}>
						<PlusIcon className="h-4 w-4" />
						Registrar visita
					</Button>
				)}
			</div>

			{formOpen && (
				<form onSubmit={handleSubmit} className="mb-4 space-y-3 rounded-md border border-slate-200 bg-slate-50 p-4">
					<p className="text-xs text-slate-500">
						La fecha y hora se capturan automáticamente al confirmar el registro.
					</p>
					<div className="flex flex-wrap gap-6">
						<Checkbox
							id="piensoSeco"
							label="Pienso seco"
							checked={piensoSeco}
							onChange={(e) => setPiensoSeco(e.target.checked)}
						/>
						<Checkbox
							id="comidaHumeda"
							label="Comida húmeda"
							checked={comidaHumeda}
							onChange={(e) => setComidaHumeda(e.target.checked)}
						/>
						<Checkbox id="agua" label="Agua" checked={agua} onChange={(e) => setAgua(e.target.checked)} />
					</div>
					<Field label="Observaciones" htmlFor="observaciones" hint="Suciedad, desperfectos u otras anomalías">
						<Textarea
							id="observaciones"
							value={observaciones}
							onChange={(e) => setObservaciones(e.target.value)}
						/>
					</Field>
					{formError && <Alert message={formError} />}
					<div className="flex justify-end gap-2">
						<Button type="button" variant="secondary" onClick={() => setFormOpen(false)} disabled={saving}>
							Cancelar
						</Button>
						<Button type="submit" loading={saving}>
							Confirmar registro
						</Button>
					</div>
				</form>
			)}

			{loading && <p className="text-sm text-slate-500">Cargando visitas...</p>}
			{error && <Alert message={getErrorMessage(error)} />}
			{!loading && !error && visitas.length === 0 && (
				<EmptyState title="Sin visitas registradas" description="Aún no se ha registrado ninguna visita a este comedero." />
			)}
			{visitas.length > 0 && (
				<ul className="divide-y divide-slate-100 text-sm">
					{visitas.map((visita) => (
						<li key={visita.id} className="flex flex-col gap-1 py-3">
							<div className="flex flex-wrap items-center justify-between gap-2">
								<span className="font-medium text-slate-800">
									{new Date(visita.createdAt).toLocaleString("es-ES")}
								</span>
								<span className="text-xs text-slate-500">
									{[
										visita.piensoSeco && "Pienso seco",
										visita.comidaHumeda && "Comida húmeda",
										visita.agua && "Agua",
									]
										.filter(Boolean)
										.join(" · ") || "Sin insumos marcados"}
								</span>
							</div>
							{visita.observaciones && <p className="text-slate-600">{visita.observaciones}</p>}
							<p className="text-xs text-slate-400">
								Registrado por {visita.usuario?.nombreCompleto ?? "un usuario ya no disponible"}
							</p>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
