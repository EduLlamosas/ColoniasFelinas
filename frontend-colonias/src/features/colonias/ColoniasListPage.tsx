import { useState } from "react";
import { useMutation } from "@apollo/client/react";
import { Link } from "react-router-dom";
import { PlusIcon, MapIcon, TableCellsIcon } from "@heroicons/react/24/outline";
import { PageHeader } from "../../components/ui/PageHeader";
import { Button } from "../../components/ui/Button";
import { Spinner } from "../../components/ui/Spinner";
import { Alert } from "../../components/ui/Alert";
import { EmptyState } from "../../components/ui/EmptyState";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { tableClass, tableWrapperClass, tdClass, theadClass, thClass, trClass } from "../../components/ui/table";
import { TIPO_SUELO_LABELS } from "../../lib/enums";
import { getErrorMessage } from "../../lib/graphqlErrors";
import { REMOVE_COLONIA_MUTATION } from "./colonias.graphql";
import { useColoniasLookup } from "./useColoniasLookup";
import { ColoniasMap } from "./ColoniasMap";
import { ColoniaFormModal } from "./ColoniaFormModal";
import type { Colonia } from "../../types/graphql";

type View = "tabla" | "mapa";

export function ColoniasListPage() {
	const { colonias, loading, error } = useColoniasLookup();
	const [view, setView] = useState<View>("tabla");
	const [editingColonia, setEditingColonia] = useState<Colonia | undefined>(undefined);
	const [formOpen, setFormOpen] = useState(false);
	const [pendingDelete, setPendingDelete] = useState<Colonia | null>(null);
	const [deleteError, setDeleteError] = useState<string | null>(null);
	const [removeColonia, { loading: deleting }] = useMutation(REMOVE_COLONIA_MUTATION, {
		refetchQueries: ["Colonias"],
	});

	function openCreate() {
		setEditingColonia(undefined);
		setFormOpen(true);
	}

	function openEdit(colonia: Colonia) {
		setEditingColonia(colonia);
		setFormOpen(true);
	}

	async function confirmDelete() {
		if (!pendingDelete) return;
		setDeleteError(null);
		try {
			await removeColonia({ variables: { id: pendingDelete.id } });
			setPendingDelete(null);
		} catch (err) {
			setDeleteError(getErrorMessage(err));
		}
	}

	return (
		<div>
			<PageHeader
				title="Colonias"
				description="Núcleos de agrupación felina censados en el municipio."
				actions={
					<>
						<div className="flex overflow-hidden rounded-md border border-slate-300">
							<button
								type="button"
								onClick={() => setView("tabla")}
								className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium ${
									view === "tabla" ? "bg-teal-700 text-white" : "bg-white text-slate-600 hover:bg-slate-50"
								}`}
							>
								<TableCellsIcon className="h-4 w-4" />
								Tabla
							</button>
							<button
								type="button"
								onClick={() => setView("mapa")}
								className={`flex items-center gap-1.5 border-l border-slate-300 px-3 py-2 text-sm font-medium ${
									view === "mapa" ? "bg-teal-700 text-white" : "bg-white text-slate-600 hover:bg-slate-50"
								}`}
							>
								<MapIcon className="h-4 w-4" />
								Mapa
							</button>
						</div>
						<Button onClick={openCreate}>
							<PlusIcon className="h-4 w-4" />
							Nueva colonia
						</Button>
					</>
				}
			/>

			{loading && (
				<div className="flex justify-center py-14">
					<Spinner size="lg" />
				</div>
			)}

			{error && <Alert message={getErrorMessage(error)} />}

			{!loading && !error && colonias.length === 0 && (
				<EmptyState title="Todavía no hay colonias censadas" description="Crea la primera con el botón de arriba." />
			)}

			{!loading && !error && colonias.length > 0 && view === "mapa" && <ColoniasMap colonias={colonias} />}

			{!loading && !error && colonias.length > 0 && view === "tabla" && (
				<div className={tableWrapperClass}>
					<table className={tableClass}>
						<thead className={theadClass}>
							<tr>
								<th className={thClass}>Foto</th>
								<th className={thClass}>Nombre</th>
								<th className={thClass}>Código oficial</th>
								<th className={thClass}>Tipo de suelo</th>
								<th className={thClass}>Coordenadas</th>
								<th className={thClass}>
									<span className="sr-only">Acciones</span>
								</th>
							</tr>
						</thead>
						<tbody>
							{colonias.map((colonia) => (
								<tr key={colonia.id} className={trClass}>
									<td className={tdClass}>
										{colonia.fotoUrl ? (
											<img src={colonia.fotoUrl} alt="" className="h-10 w-10 rounded-md object-cover" />
										) : (
											<div className="h-10 w-10 rounded-md bg-slate-100" />
										)}
									</td>
									<td className={tdClass}>
										<Link to={`/colonias/${colonia.id}`} className="font-medium text-teal-700 hover:underline">
											{colonia.nombre}
										</Link>
									</td>
									<td className={tdClass}>{colonia.codigoOficial}</td>
									<td className={tdClass}>{TIPO_SUELO_LABELS[colonia.tipoSuelo]}</td>
									<td className={`${tdClass} font-mono text-xs`}>
										{colonia.latitud.toFixed(5)}, {colonia.longitud.toFixed(5)}
									</td>
									<td className={`${tdClass} text-right`}>
										<button
											type="button"
											onClick={() => openEdit(colonia)}
											className="mr-3 font-medium text-teal-700 hover:underline"
										>
											Editar
										</button>
										<button
											type="button"
											onClick={() => setPendingDelete(colonia)}
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
				<ColoniaFormModal
					key={editingColonia?.id ?? "new"}
					open={formOpen}
					colonia={editingColonia}
					onClose={() => setFormOpen(false)}
				/>
			)}

			<ConfirmDialog
				open={pendingDelete !== null}
				title="Eliminar colonia"
				description={
					deleteError ??
					`¿Seguro que quieres eliminar "${pendingDelete?.nombre}"? Si tiene gatos censados, la operación se rechazará.`
				}
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
