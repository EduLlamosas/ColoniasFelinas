import { useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery } from "@apollo/client/react";
import { ArrowLeftIcon, DocumentCheckIcon, PencilSquareIcon, TrashIcon } from "@heroicons/react/24/outline";
import { Spinner } from "../../components/ui/Spinner";
import { Alert } from "../../components/ui/Alert";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { tableClass, tableWrapperClass, tdClass, theadClass, thClass, trClass } from "../../components/ui/table";
import { getErrorMessage } from "../../lib/graphqlErrors";
import { VOLUNTARIOS_QUERY, REMOVE_VOLUNTARIO_MUTATION } from "./voluntarios.graphql";
import { VoluntarioFormModal } from "./VoluntarioFormModal";
import { ASIGNACIONES_QUERY } from "../asignaciones/asignaciones.graphql";
import { AsignacionFormModal } from "../asignaciones/AsignacionFormModal";
import { useColoniasLookup } from "../colonias/useColoniasLookup";
import type { Asignacion, Voluntario } from "../../types/graphql";

export function VoluntarioDetailPage() {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();
	const { data, loading, error } = useQuery<{ voluntarios: Voluntario[] }>(VOLUNTARIOS_QUERY);
	const { data: asignacionesData, loading: loadingAsignaciones } = useQuery<{ asignaciones: Asignacion[] }>(
		ASIGNACIONES_QUERY,
	);
	const { byId: coloniasById } = useColoniasLookup();
	const [editOpen, setEditOpen] = useState(false);
	const [asignacionFormOpen, setAsignacionFormOpen] = useState(false);
	const [pendingDelete, setPendingDelete] = useState(false);
	const [deleteError, setDeleteError] = useState<string | null>(null);
	const [removeVoluntario, { loading: deleting }] = useMutation(REMOVE_VOLUNTARIO_MUTATION, {
		refetchQueries: ["Voluntarios"],
	});

	if (!id) return <Navigate to="/voluntarios" replace />;

	if (loading) {
		return (
			<div className="flex justify-center py-14">
				<Spinner size="lg" />
			</div>
		);
	}

	if (error) return <Alert message={getErrorMessage(error)} />;

	const voluntario = data?.voluntarios.find((v) => v.id === id);

	if (!voluntario) {
		return <EmptyState title="Voluntario no encontrado" description="Puede que haya sido eliminado." />;
	}

	const asignaciones = (asignacionesData?.asignaciones ?? []).filter((a) => a.voluntarioId === Number(id));

	async function confirmDelete() {
		setDeleteError(null);
		try {
			await removeVoluntario({ variables: { id } });
			navigate("/voluntarios");
		} catch (err) {
			setDeleteError(getErrorMessage(err));
		}
	}

	return (
		<div>
			<Link
				to="/voluntarios"
				className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
			>
				<ArrowLeftIcon className="h-4 w-4" />
				Volver a voluntarios
			</Link>

			<div className="mb-6 flex flex-wrap items-start justify-between gap-3">
				<div>
					<h1 className="text-xl font-semibold text-slate-900">{voluntario.nombre}</h1>
					<p className="mt-1 text-sm text-slate-500">{voluntario.dni}</p>
				</div>
				<div className="flex gap-2">
					<Button variant="secondary" onClick={() => setEditOpen(true)}>
						<PencilSquareIcon className="h-4 w-4" />
						Editar
					</Button>
					<Button variant="danger" onClick={() => setPendingDelete(true)}>
						<TrashIcon className="h-4 w-4" />
						Eliminar
					</Button>
				</div>
			</div>

			<div className="mb-8 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
				<h2 className="mb-3 text-sm font-semibold text-slate-900">Datos de contacto</h2>
				<dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
					<div>
						<dt className="text-slate-500">Teléfono</dt>
						<dd className="text-slate-700">{voluntario.telefono ?? "—"}</dd>
					</div>
					<div>
						<dt className="text-slate-500">Documento RGPD</dt>
						<dd>
							{voluntario.urlCesionDatos ? (
								<a
									href={voluntario.urlCesionDatos}
									target="_blank"
									rel="noreferrer"
									className="inline-flex items-center gap-1 text-teal-700 hover:underline"
								>
									<DocumentCheckIcon className="h-4 w-4" />
									Ver documento firmado
								</a>
							) : (
								<Badge className="bg-red-100 text-red-700">Falta documento</Badge>
							)}
						</dd>
					</div>
				</dl>
			</div>

			<section>
				<div className="mb-3 flex items-center justify-between">
					<h2 className="text-sm font-semibold text-slate-900">Colonias asignadas ({asignaciones.length})</h2>
					<Button variant="secondary" onClick={() => setAsignacionFormOpen(true)}>
						Asignar a una colonia
					</Button>
				</div>
				{loadingAsignaciones ? (
					<Spinner size="sm" />
				) : asignaciones.length === 0 ? (
					<EmptyState title="Sin colonias asignadas a este voluntario" />
				) : (
					<div className={tableWrapperClass}>
						<table className={tableClass}>
							<thead className={theadClass}>
								<tr>
									<th className={thClass}>Colonia</th>
									<th className={thClass}>Rol</th>
								</tr>
							</thead>
							<tbody>
								{asignaciones.map((asignacion) => (
									<tr key={asignacion.coloniaId} className={trClass}>
										<td className={tdClass}>
											<Link
												to={`/colonias/${asignacion.coloniaId}`}
												className="font-medium text-teal-700 hover:underline"
											>
												{coloniasById.get(String(asignacion.coloniaId))?.nombre ?? "—"}
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

			{editOpen && <VoluntarioFormModal open={editOpen} voluntario={voluntario} onClose={() => setEditOpen(false)} />}
			{asignacionFormOpen && (
				<AsignacionFormModal
					open={asignacionFormOpen}
					defaultVoluntarioId={id}
					onClose={() => setAsignacionFormOpen(false)}
				/>
			)}

			<ConfirmDialog
				open={pendingDelete}
				title="Eliminar voluntario"
				description={deleteError ?? `¿Seguro que quieres eliminar a "${voluntario.nombre}"?`}
				loading={deleting}
				onConfirm={confirmDelete}
				onCancel={() => {
					setPendingDelete(false);
					setDeleteError(null);
				}}
			/>
		</div>
	);
}
