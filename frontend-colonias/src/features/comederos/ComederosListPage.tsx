import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery } from "@apollo/client/react";
import { PlusIcon } from "@heroicons/react/24/outline";
import { PageHeader } from "../../components/ui/PageHeader";
import { Button } from "../../components/ui/Button";
import { Spinner } from "../../components/ui/Spinner";
import { Alert } from "../../components/ui/Alert";
import { EmptyState } from "../../components/ui/EmptyState";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { Select } from "../../components/ui/Select";
import { tableClass, tableWrapperClass, tdClass, theadClass, thClass, trClass } from "../../components/ui/table";
import { getErrorMessage } from "../../lib/graphqlErrors";
import { COMEDEROS_QUERY, REMOVE_COMEDERO_MUTATION } from "./comederos.graphql";
import { ComederoFormModal } from "./ComederoFormModal";
import { useColoniasLookup } from "../colonias/useColoniasLookup";
import type { Comedero } from "../../types/graphql";

export function ComederosListPage() {
	const { data, loading, error } = useQuery<{ comederos: Comedero[] }>(COMEDEROS_QUERY);
	const { byId: coloniasById } = useColoniasLookup();
	const [coloniaFilter, setColoniaFilter] = useState("");
	const [editingComedero, setEditingComedero] = useState<Comedero | undefined>(undefined);
	const [formOpen, setFormOpen] = useState(false);
	const [pendingDelete, setPendingDelete] = useState<Comedero | null>(null);
	const [deleteError, setDeleteError] = useState<string | null>(null);
	const [removeComedero, { loading: deleting }] = useMutation(REMOVE_COMEDERO_MUTATION, {
		refetchQueries: ["Comederos"],
	});

	const comederos = useMemo(() => {
		const all = data?.comederos ?? [];
		return coloniaFilter ? all.filter((c) => c.coloniaId === Number(coloniaFilter)) : all;
	}, [data, coloniaFilter]);

	function openCreate() {
		setEditingComedero(undefined);
		setFormOpen(true);
	}

	function openEdit(comedero: Comedero) {
		setEditingComedero(comedero);
		setFormOpen(true);
	}

	async function confirmDelete() {
		if (!pendingDelete) return;
		setDeleteError(null);
		try {
			await removeComedero({ variables: { id: pendingDelete.id } });
			setPendingDelete(null);
		} catch (err) {
			setDeleteError(getErrorMessage(err));
		}
	}

	return (
		<div>
			<PageHeader
				title="Comederos"
				description="Puntos de alimentación asociados a cada colonia."
				actions={
					<Button onClick={openCreate}>
						<PlusIcon className="h-4 w-4" />
						Nuevo comedero
					</Button>
				}
			/>

			<div className="mb-4 max-w-xs">
				<Select value={coloniaFilter} onChange={(e) => setColoniaFilter(e.target.value)}>
					<option value="">Todas las colonias</option>
					{[...coloniasById.values()].map((colonia) => (
						<option key={colonia.id} value={colonia.id}>
							{colonia.nombre}
						</option>
					))}
				</Select>
			</div>

			{loading && (
				<div className="flex justify-center py-14">
					<Spinner size="lg" />
				</div>
			)}

			{error && <Alert message={getErrorMessage(error)} />}

			{!loading && !error && comederos.length === 0 && (
				<EmptyState title="No hay comederos que mostrar" description="Prueba a cambiar el filtro o registra uno nuevo." />
			)}

			{!loading && !error && comederos.length > 0 && (
				<div className={tableWrapperClass}>
					<table className={tableClass}>
						<thead className={theadClass}>
							<tr>
								<th className={thClass}>Foto</th>
								<th className={thClass}>Colonia</th>
								<th className={thClass}>Ubicación</th>
								<th className={thClass}>
									<span className="sr-only">Acciones</span>
								</th>
							</tr>
						</thead>
						<tbody>
							{comederos.map((comedero) => (
								<tr key={comedero.id} className={trClass}>
									<td className={tdClass}>
										{comedero.fotoUrl ? (
											<img src={comedero.fotoUrl} alt="" className="h-10 w-10 rounded-md object-cover" />
										) : (
											<div className="h-10 w-10 rounded-md bg-slate-100" />
										)}
									</td>
									<td className={tdClass}>
										<Link to={`/colonias/${comedero.coloniaId}`} className="font-medium text-teal-700 hover:underline">
											{coloniasById.get(String(comedero.coloniaId))?.nombre ?? "—"}
										</Link>
									</td>
									<td className={tdClass}>
										<Link to={`/comederos/${comedero.id}`} className="font-medium text-teal-700 hover:underline">
											{comedero.ubicacionDetallada}
										</Link>
									</td>
									<td className={`${tdClass} text-right`}>
										<button
											type="button"
											onClick={() => openEdit(comedero)}
											className="mr-3 font-medium text-teal-700 hover:underline"
										>
											Editar
										</button>
										<button
											type="button"
											onClick={() => setPendingDelete(comedero)}
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
				<ComederoFormModal
					key={editingComedero?.id ?? "new"}
					open={formOpen}
					comedero={editingComedero}
					onClose={() => setFormOpen(false)}
				/>
			)}

			<ConfirmDialog
				open={pendingDelete !== null}
				title="Eliminar comedero"
				description={deleteError ?? "¿Seguro que quieres eliminar este comedero?"}
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
