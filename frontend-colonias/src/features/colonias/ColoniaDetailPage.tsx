import { useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { useQuery } from "@apollo/client/react";
import { ArrowLeftIcon, PencilSquareIcon, PhotoIcon, PlusIcon } from "@heroicons/react/24/outline";
import { Spinner } from "../../components/ui/Spinner";
import { Alert } from "../../components/ui/Alert";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { tableClass, tableWrapperClass, tdClass, theadClass, thClass, trClass } from "../../components/ui/table";
import { ESTADO_CER_BADGE_CLASSES, ESTADO_CER_LABELS, TIPO_SUELO_LABELS } from "../../lib/enums";
import { getErrorMessage } from "../../lib/graphqlErrors";
import { useColoniasLookup } from "./useColoniasLookup";
import { ColoniasMap } from "./ColoniasMap";
import { ColoniaFormModal } from "./ColoniaFormModal";
import { GATOS_QUERY } from "../gatos/gatos.graphql";
import { GatoFormModal } from "../gatos/GatoFormModal";
import { COMEDEROS_QUERY } from "../comederos/comederos.graphql";
import { ComederoFormModal } from "../comederos/ComederoFormModal";
import { ASIGNACIONES_QUERY } from "../asignaciones/asignaciones.graphql";
import { AsignacionFormModal } from "../asignaciones/AsignacionFormModal";
import { VOLUNTARIOS_QUERY } from "../voluntarios/voluntarios.graphql";
import type { Asignacion, Comedero, Gato, Voluntario } from "../../types/graphql";

export function ColoniaDetailPage() {
	const { id } = useParams<{ id: string }>();
	const { byId, loading: loadingColonias, error: coloniasError } = useColoniasLookup();
	const colonia = id ? byId.get(id) : undefined;

	const { data: gatosData, loading: loadingGatos } = useQuery<{ gatos: Gato[] }>(GATOS_QUERY);
	const { data: comederosData, loading: loadingComederos } = useQuery<{ comederos: Comedero[] }>(COMEDEROS_QUERY);
	const { data: asignacionesData, loading: loadingAsignaciones } = useQuery<{ asignaciones: Asignacion[] }>(
		ASIGNACIONES_QUERY,
	);
	const { data: voluntariosData } = useQuery<{ voluntarios: Voluntario[] }>(VOLUNTARIOS_QUERY);
	const voluntariosById = useMemo(
		() => new Map((voluntariosData?.voluntarios ?? []).map((v) => [v.id, v])),
		[voluntariosData],
	);

	const [editOpen, setEditOpen] = useState(false);
	const [gatoFormOpen, setGatoFormOpen] = useState(false);
	const [comederoFormOpen, setComederoFormOpen] = useState(false);
	const [asignacionFormOpen, setAsignacionFormOpen] = useState(false);

	if (!id) return <Navigate to="/colonias" replace />;

	if (loadingColonias) {
		return (
			<div className="flex justify-center py-14">
				<Spinner size="lg" />
			</div>
		);
	}

	if (coloniasError) return <Alert message={getErrorMessage(coloniasError)} />;

	if (!colonia) {
		return <EmptyState title="Colonia no encontrada" description="Puede que haya sido eliminada." />;
	}

	const gatos = (gatosData?.gatos ?? []).filter((g) => g.coloniaId === Number(id));
	const comederos = (comederosData?.comederos ?? []).filter((c) => c.coloniaId === Number(id));
	const asignaciones = (asignacionesData?.asignaciones ?? []).filter((a) => a.coloniaId === Number(id));

	return (
		<div>
			<Link to="/colonias" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
				<ArrowLeftIcon className="h-4 w-4" />
				Volver a colonias
			</Link>

			<div className="mb-6 flex flex-wrap items-start justify-between gap-3">
				<div>
					<h1 className="text-xl font-semibold text-slate-900">{colonia.nombre}</h1>
					<p className="mt-1 text-sm text-slate-500">
						{colonia.codigoOficial} · {TIPO_SUELO_LABELS[colonia.tipoSuelo]}
					</p>
				</div>
				<Button variant="secondary" onClick={() => setEditOpen(true)}>
					<PencilSquareIcon className="h-4 w-4" />
					Editar colonia
				</Button>
			</div>

			<div className="mb-8 flex max-w-md items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
				{colonia.fotoUrl ? (
					<img src={colonia.fotoUrl} alt="" className="h-64 w-full object-cover" />
				) : (
					<PhotoIcon className="h-16 w-16 text-slate-300" />
				)}
			</div>

			<div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
				<div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
					<h2 className="mb-3 text-sm font-semibold text-slate-900">Datos generales</h2>
					<dl className="space-y-2 text-sm">
						<div className="flex justify-between gap-4">
							<dt className="text-slate-500">Coordenadas</dt>
							<dd className="font-mono text-slate-700">
								{colonia.latitud.toFixed(5)}, {colonia.longitud.toFixed(5)}
							</dd>
						</div>
						<div>
							<dt className="text-slate-500">Observaciones</dt>
							<dd className="mt-1 whitespace-pre-wrap text-slate-700">{colonia.observaciones || "Sin observaciones."}</dd>
						</div>
					</dl>
				</div>
				<ColoniasMap colonias={[colonia]} />
			</div>

			<section className="mb-8">
				<div className="mb-3 flex items-center justify-between">
					<h2 className="text-sm font-semibold text-slate-900">Gatos censados ({gatos.length})</h2>
					<Button variant="secondary" onClick={() => setGatoFormOpen(true)}>
						<PlusIcon className="h-4 w-4" />
						Añadir gato
					</Button>
				</div>
				{loadingGatos ? (
					<Spinner size="sm" />
				) : gatos.length === 0 ? (
					<EmptyState title="Sin gatos censados en esta colonia" />
				) : (
					<div className={tableWrapperClass}>
						<table className={tableClass}>
							<thead className={theadClass}>
								<tr>
									<th className={thClass}>Nombre</th>
									<th className={thClass}>Capa</th>
									<th className={thClass}>Estado</th>
								</tr>
							</thead>
							<tbody>
								{gatos.map((gato) => (
									<tr key={gato.id} className={trClass}>
										<td className={tdClass}>
											<Link to={`/gatos/${gato.id}`} className="font-medium text-teal-700 hover:underline">
												{gato.nombre ?? "Sin nombre"}
											</Link>
										</td>
										<td className={tdClass}>{gato.capaPelaje}</td>
										<td className={tdClass}>
											<Badge className={ESTADO_CER_BADGE_CLASSES[gato.estadoCer]}>
												{ESTADO_CER_LABELS[gato.estadoCer]}
											</Badge>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</section>

			<section className="mb-8">
				<div className="mb-3 flex items-center justify-between">
					<h2 className="text-sm font-semibold text-slate-900">Comederos ({comederos.length})</h2>
					<Button variant="secondary" onClick={() => setComederoFormOpen(true)}>
						<PlusIcon className="h-4 w-4" />
						Añadir comedero
					</Button>
				</div>
				{loadingComederos ? (
					<Spinner size="sm" />
				) : comederos.length === 0 ? (
					<EmptyState title="Sin comederos registrados en esta colonia" />
				) : (
					<div className={tableWrapperClass}>
						<table className={tableClass}>
							<thead className={theadClass}>
								<tr>
									<th className={thClass}>Ubicación</th>
								</tr>
							</thead>
							<tbody>
								{comederos.map((comedero) => (
									<tr key={comedero.id} className={trClass}>
										<td className={tdClass}>
											<Link to={`/comederos/${comedero.id}`} className="font-medium text-teal-700 hover:underline">
												{comedero.ubicacionDetallada}
											</Link>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</section>

			<section>
				<div className="mb-3 flex items-center justify-between">
					<h2 className="text-sm font-semibold text-slate-900">Voluntarios asignados ({asignaciones.length})</h2>
					<Button variant="secondary" onClick={() => setAsignacionFormOpen(true)}>
						<PlusIcon className="h-4 w-4" />
						Asignar voluntario
					</Button>
				</div>
				{loadingAsignaciones ? (
					<Spinner size="sm" />
				) : asignaciones.length === 0 ? (
					<EmptyState title="Sin voluntarios asignados a esta colonia" />
				) : (
					<div className={tableWrapperClass}>
						<table className={tableClass}>
							<thead className={theadClass}>
								<tr>
									<th className={thClass}>Voluntario</th>
									<th className={thClass}>Rol</th>
								</tr>
							</thead>
							<tbody>
								{asignaciones.map((asignacion) => (
									<tr key={asignacion.voluntarioId} className={trClass}>
										<td className={tdClass}>
											<Link
												to={`/voluntarios/${asignacion.voluntarioId}`}
												className="font-medium text-teal-700 hover:underline"
											>
												{voluntariosById.get(String(asignacion.voluntarioId))?.nombre ?? "—"}
											</Link>
										</td>
										<td className={tdClass}>
											<Badge className="bg-teal-100 text-teal-800">{asignacion.rolAsignado}</Badge>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</section>

			{editOpen && <ColoniaFormModal open={editOpen} colonia={colonia} onClose={() => setEditOpen(false)} />}
			{gatoFormOpen && (
				<GatoFormModal open={gatoFormOpen} defaultColoniaId={id} onClose={() => setGatoFormOpen(false)} />
			)}
			{comederoFormOpen && (
				<ComederoFormModal open={comederoFormOpen} defaultColoniaId={id} onClose={() => setComederoFormOpen(false)} />
			)}
			{asignacionFormOpen && (
				<AsignacionFormModal
					open={asignacionFormOpen}
					defaultColoniaId={id}
					onClose={() => setAsignacionFormOpen(false)}
				/>
			)}
		</div>
	);
}
