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
import { VOLUNTARIOS_QUERY, REMOVE_VOLUNTARIO_MUTATION } from "./voluntarios.graphql";
import { VoluntarioFormModal } from "./VoluntarioFormModal";
import type { Voluntario } from "../../types/graphql";

export function VoluntariosListPage() {
	const { data, loading, error } = useQuery<{ voluntarios: Voluntario[] }>(VOLUNTARIOS_QUERY);
	const [editingVoluntario, setEditingVoluntario] = useState<Voluntario | undefined>(undefined);
	const [formOpen, setFormOpen] = useState(false);
	const [pendingDelete, setPendingDelete] = useState<Voluntario | null>(null);
	const [deleteError, setDeleteError] = useState<string | null>(null);
	const [removeVoluntario, { loading: deleting }] = useMutation(REMOVE_VOLUNTARIO_MUTATION, {
		refetchQueries: ["Voluntarios"],
	});

	const voluntarios = data?.voluntarios ?? [];

	function openCreate() {
		setEditingVoluntario(undefined);
		setFormOpen(true);
	}

	function openEdit(voluntario: Voluntario) {
		setEditingVoluntario(voluntario);
		setFormOpen(true);
	}

	async function confirmDelete() {
		if (!pendingDelete) return;
		setDeleteError(null);
		try {
			await removeVoluntario({ variables: { id: pendingDelete.id } });
			setPendingDelete(null);
		} catch (err) {
			setDeleteError(getErrorMessage(err));
		}
	}

	return (
		<div>
			<PageHeader
				title="Voluntarios"
				description="Ciudadanos colaboradores registrados, con su documento RGPD de cesión de datos."
				actions={
					<Button onClick={openCreate}>
						<PlusIcon className="h-4 w-4" />
						Nuevo voluntario
					</Button>
				}
			/>

			{loading && (
				<div className="flex justify-center py-14">
					<Spinner size="lg" />
				</div>
			)}

			{error && <Alert message={getErrorMessage(error)} />}

			{!loading && !error && voluntarios.length === 0 && (
				<EmptyState title="Todavía no hay voluntarios registrados" description="Da de alta al primero con el botón de arriba." />
			)}

			{!loading && !error && voluntarios.length > 0 && (
				<div className={tableWrapperClass}>
					<table className={tableClass}>
						<thead className={theadClass}>
							<tr>
								<th className={thClass}>Nombre</th>
								<th className={thClass}>DNI</th>
								<th className={thClass}>Teléfono</th>
								<th className={thClass}>RGPD</th>
								<th className={thClass}>
									<span className="sr-only">Acciones</span>
								</th>
							</tr>
						</thead>
						<tbody>
							{voluntarios.map((voluntario) => (
								<tr key={voluntario.id} className={trClass}>
									<td className={tdClass}>
										<Link to={`/voluntarios/${voluntario.id}`} className="font-medium text-teal-700 hover:underline">
											{voluntario.nombre}
										</Link>
									</td>
									<td className={tdClass}>{voluntario.dni}</td>
									<td className={tdClass}>{voluntario.telefono ?? "—"}</td>
									<td className={tdClass}>
										{voluntario.urlCesionDatos ? (
											<a
												href={voluntario.urlCesionDatos}
												target="_blank"
												rel="noreferrer"
												className="text-teal-700 hover:underline"
											>
												<Badge className="bg-teal-100 text-teal-800">Documento firmado</Badge>
											</a>
										) : (
											<Badge className="bg-red-100 text-red-700">Falta documento</Badge>
										)}
									</td>
									<td className={`${tdClass} text-right`}>
										<button
											type="button"
											onClick={() => openEdit(voluntario)}
											className="mr-3 font-medium text-teal-700 hover:underline"
										>
											Editar
										</button>
										<button
											type="button"
											onClick={() => setPendingDelete(voluntario)}
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
				<VoluntarioFormModal
					key={editingVoluntario?.id ?? "new"}
					open={formOpen}
					voluntario={editingVoluntario}
					onClose={() => setFormOpen(false)}
				/>
			)}

			<ConfirmDialog
				open={pendingDelete !== null}
				title="Eliminar voluntario"
				description={deleteError ?? `¿Seguro que quieres eliminar a "${pendingDelete?.nombre}"?`}
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
