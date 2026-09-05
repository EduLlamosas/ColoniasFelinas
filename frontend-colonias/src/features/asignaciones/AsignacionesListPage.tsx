import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery } from "@apollo/client/react";
import { PlusIcon } from "@heroicons/react/24/outline";
import { PageHeader } from "../../components/ui/PageHeader";
import { Button } from "../../components/ui/Button";
import { Spinner } from "../../components/ui/Spinner";
import { Alert } from "../../components/ui/Alert";
import { Badge } from "../../components/ui/Badge";
import { EmptyState } from "../../components/ui/EmptyState";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { tableClass, tableWrapperClass, tdClass, theadClass, thClass, trClass } from "../../components/ui/table";
import { getErrorMessage } from "../../lib/graphqlErrors";
import { ASIGNACIONES_QUERY, REMOVE_ASIGNACION_MUTATION } from "./asignaciones.graphql";
import { VOLUNTARIOS_QUERY } from "../voluntarios/voluntarios.graphql";
import { AsignacionFormModal } from "./AsignacionFormModal";
import { useColoniasLookup } from "../colonias/useColoniasLookup";
import type { Asignacion, Voluntario } from "../../types/graphql";

export function AsignacionesListPage() {
	const { data, loading, error } = useQuery<{ asignaciones: Asignacion[] }>(ASIGNACIONES_QUERY);
	const { data: voluntariosData } = useQuery<{ voluntarios: Voluntario[] }>(VOLUNTARIOS_QUERY);
	const { byId: coloniasById } = useColoniasLookup();
	const voluntariosById = new Map((voluntariosData?.voluntarios ?? []).map((v) => [v.id, v]));

	const [editingAsignacion, setEditingAsignacion] = useState<Asignacion | undefined>(undefined);
	const [formOpen, setFormOpen] = useState(false);
	const [pendingDelete, setPendingDelete] = useState<Asignacion | null>(null);
	const [deleteError, setDeleteError] = useState<string | null>(null);
	const [removeAsignacion, { loading: deleting }] = useMutation(REMOVE_ASIGNACION_MUTATION, {
		refetchQueries: ["Asignaciones"],
	});

	const asignaciones = data?.asignaciones ?? [];

	function openCreate() {
		setEditingAsignacion(undefined);
		setFormOpen(true);
	}

	function openEdit(asignacion: Asignacion) {
		setEditingAsignacion(asignacion);
		setFormOpen(true);
	}

	async function confirmDelete() {
		if (!pendingDelete) return;
		setDeleteError(null);
		try {
			await removeAsignacion({
				variables: { voluntarioId: pendingDelete.voluntarioId, coloniaId: pendingDelete.coloniaId },
			});
			setPendingDelete(null);
		} catch (err) {
			setDeleteError(getErrorMessage(err));
		}
	}

	return (
		<div>
			<PageHeader
				title="Asignaciones"
				description="Relación entre voluntarios y las colonias que atienden, con su función."
				actions={
					<Button onClick={openCreate}>
						<PlusIcon className="h-4 w-4" />
						Nueva asignación
					</Button>
				}
			/>

			{loading && (
				<div className="flex justify-center py-14">
					<Spinner size="lg" />
				</div>
			)}

			{error && <Alert message={getErrorMessage(error)} />}

			{!loading && !error && asignaciones.length === 0 && (
				<EmptyState title="No hay asignaciones todavía" description="Vincula un voluntario a una colonia con el botón de arriba." />
			)}

			{!loading && !error && asignaciones.length > 0 && (
				<div className={tableWrapperClass}>
					<table className={tableClass}>
						<thead className={theadClass}>
							<tr>
								<th className={thClass}>Voluntario</th>
								<th className={thClass}>Colonia</th>
								<th className={thClass}>Rol</th>
								<th className={thClass}>
									<span className="sr-only">Acciones</span>
								</th>
							</tr>
						</thead>
						<tbody>
							{asignaciones.map((asignacion) => (
								<tr key={`${asignacion.voluntarioId}-${asignacion.coloniaId}`} className={trClass}>
									<td className={tdClass}>
										<Link
											to={`/voluntarios/${asignacion.voluntarioId}`}
											className="font-medium text-teal-700 hover:underline"
										>
											{voluntariosById.get(String(asignacion.voluntarioId))?.nombre ?? "—"}
										</Link>
									</td>
									<td className={tdClass}>
										<Link to={`/colonias/${asignacion.coloniaId}`} className="font-medium text-teal-700 hover:underline">
											{coloniasById.get(String(asignacion.coloniaId))?.nombre ?? "—"}
										</Link>
									</td>
									<td className={tdClass}>
										<Badge className="bg-teal-100 text-teal-800">{asignacion.rolAsignado}</Badge>
									</td>
									<td className={`${tdClass} text-right`}>
										<button
											type="button"
											onClick={() => openEdit(asignacion)}
											className="mr-3 font-medium text-teal-700 hover:underline"
										>
											Editar
										</button>
										<button
											type="button"
											onClick={() => setPendingDelete(asignacion)}
											className="font-medium text-red-600 hover:underline"
										>
											Eliminar
										</button>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}

			{formOpen && (
				<AsignacionFormModal
					key={editingAsignacion ? `${editingAsignacion.voluntarioId}-${editingAsignacion.coloniaId}` : "new"}
					open={formOpen}
					asignacion={editingAsignacion}
					onClose={() => setFormOpen(false)}
				/>
			)}

			<ConfirmDialog
				open={pendingDelete !== null}
				title="Eliminar asignación"
				description={deleteError ?? "¿Seguro que quieres eliminar esta asignación?"}
				loading={deleting}
				onConfirm={confirmDelete}
				onCancel={() => {
					setPendingDelete(null);
					setDeleteError(null);
				}}
			/>
		</div>
	);
}
