import { useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { useQuery } from "@apollo/client/react";
import { PencilSquareIcon, PhotoIcon, PlusIcon } from "@heroicons/react/24/outline";
import { BackLink } from "../../components/ui/BackLink";
import { Spinner } from "../../components/ui/Spinner";
import { Alert } from "../../components/ui/Alert";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { tableClass, tableWrapperClass, tdClass, theadClass, thClass, trClass } from "../../components/ui/table";
import { useAuth } from "../auth/useAuth";
import { ESTADO_CER_BADGE_CLASSES, ESTADO_CER_LABELS, TIPO_SUELO_LABELS } from "../../lib/enums";
import { getErrorMessage } from "../../lib/graphqlErrors";
import { resolveMediaUrl } from "../../lib/config";
import { COLONIA_DETAIL_QUERY } from "./colonias.graphql";
import { ColoniasMap } from "./ColoniasMap";
import { ColoniaFormModal } from "./ColoniaFormModal";
import { GatoFormModal } from "../gatos/GatoFormModal";
import { ComederoFormModal } from "../comederos/ComederoFormModal";
import { AsignacionFormModal } from "../asignaciones/AsignacionFormModal";
import type { Asignacion, Colonia, Comedero, Gato } from "../../types/graphql";

interface ColoniaDetail extends Colonia {
	gatos: Gato[];
	comederos: Comedero[];
	asignaciones: Asignacion[];
}

export function ColoniaDetailPage() {
	const { isAdmin } = useAuth();
	const { id } = useParams<{ id: string }>();
	const { data, loading, error } = useQuery<{ colonia: ColoniaDetail }>(COLONIA_DETAIL_QUERY, {
		variables: { id },
		skip: !id,
	});
	const colonia = data?.colonia;

	const [editOpen, setEditOpen] = useState(false);
	const [gatoFormOpen, setGatoFormOpen] = useState(false);
	const [comederoFormOpen, setComederoFormOpen] = useState(false);
	const [asignacionFormOpen, setAsignacionFormOpen] = useState(false);

	if (!id) return <Navigate to="/colonias" replace />;

	if (loading) {
		return (
			<div className="flex justify-center py-14">
				<Spinner size="lg" />
			</div>
		);
	}

	if (error) return <Alert message={getErrorMessage(error)} />;

	if (!colonia) {
		return <EmptyState title="Colonia no encontrada" description="Puede que haya sido eliminada." />;
	}

	const gatos = colonia.gatos;
	const comederos = colonia.comederos;
	const asignaciones = colonia.asignaciones;

	return (
		<div>
			<BackLink fallbackTo="/colonias" fallbackLabel="Volver a colonias" />

			<div className="mb-6 flex flex-wrap items-start justify-between gap-3">
				<div>
					<h1 className="text-xl font-semibold text-slate-900">{colonia.nombre}</h1>
					<p className="mt-1 text-sm text-slate-500">
						{colonia.codigoOficial ?? "Sin código oficial"} · {TIPO_SUELO_LABELS[colonia.tipoSuelo]}
					</p>
				</div>
				{isAdmin && (
					<Button variant="secondary" onClick={() => setEditOpen(true)}>
						<PencilSquareIcon className="h-4 w-4" />
						Editar colonia
					</Button>
				)}
			</div>

			<div className="mb-8 flex max-w-md items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
				{colonia.fotoUrl ? (
					<img src={resolveMediaUrl(colonia.fotoUrl)!} alt="" className="h-64 w-full object-cover" />
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
					{isAdmin && (
						<Button variant="secondary" onClick={() => setGatoFormOpen(true)}>
							<PlusIcon className="h-4 w-4" />
							Añadir gato
						</Button>
					)}
				</div>
				{gatos.length === 0 ? (
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
					{isAdmin && (
						<Button variant="secondary" onClick={() => setComederoFormOpen(true)}>
							<PlusIcon className="h-4 w-4" />
							Añadir comedero
						</Button>
					)}
				</div>
				{comederos.length === 0 ? (
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
					{isAdmin && (
						<Button variant="secondary" onClick={() => setAsignacionFormOpen(true)}>
							<PlusIcon className="h-4 w-4" />
							Asignar voluntario
						</Button>
					)}
				</div>
				{asignaciones.length === 0 ? (
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
												{asignacion.voluntario?.nombre ?? "—"}
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

			{editOpen && <ColoniaFormModal open={editOpen} coloniaId={id} onClose={() => setEditOpen(false)} />}
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
