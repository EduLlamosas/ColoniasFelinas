import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery } from "@apollo/client/react";
import { PlusIcon, CheckBadgeIcon } from "@heroicons/react/24/outline";
import { PageHeader } from "../../components/ui/PageHeader";
import { Button } from "../../components/ui/Button";
import { Spinner } from "../../components/ui/Spinner";
import { Alert } from "../../components/ui/Alert";
import { Badge } from "../../components/ui/Badge";
import { EmptyState } from "../../components/ui/EmptyState";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { Select } from "../../components/ui/Select";
import { tableClass, tableWrapperClass, tdClass, theadClass, thClass, trClass } from "../../components/ui/table";
import { ESTADO_CER_BADGE_CLASSES, ESTADO_CER_LABELS, SEXO_LABELS } from "../../lib/enums";
import { getErrorMessage } from "../../lib/graphqlErrors";
import { GATOS_QUERY, REMOVE_GATO_MUTATION } from "./gatos.graphql";
import { GatoFormModal } from "./GatoFormModal";
import { useColoniasLookup } from "../colonias/useColoniasLookup";
import type { Gato } from "../../types/graphql";

export function GatosListPage() {
	const { data, loading, error } = useQuery<{ gatos: Gato[] }>(GATOS_QUERY);
	const { byId: coloniasById } = useColoniasLookup();
	const [coloniaFilter, setColoniaFilter] = useState("");
	const [editingGato, setEditingGato] = useState<Gato | undefined>(undefined);
	const [formOpen, setFormOpen] = useState(false);
	const [pendingDelete, setPendingDelete] = useState<Gato | null>(null);
	const [deleteError, setDeleteError] = useState<string | null>(null);
	const [removeGato, { loading: deleting }] = useMutation(REMOVE_GATO_MUTATION, {
		refetchQueries: ["Gatos"],
	});

	const gatos = useMemo(() => {
		const all = data?.gatos ?? [];
		return coloniaFilter ? all.filter((g) => g.coloniaId === Number(coloniaFilter)) : all;
	}, [data, coloniaFilter]);

	function openCreate() {
		setEditingGato(undefined);
		setFormOpen(true);
	}

	function openEdit(gato: Gato) {
		setEditingGato(gato);
		setFormOpen(true);
	}

	async function confirmDelete() {
		if (!pendingDelete) return;
		setDeleteError(null);
		try {
			await removeGato({ variables: { id: pendingDelete.id } });
			setPendingDelete(null);
		} catch (err) {
			setDeleteError(getErrorMessage(err));
		}
	}

	return (
		<div>
			<PageHeader
				title="Gatos"
				description="Censo individualizado de los felinos del municipio."
				actions={
					<Button onClick={openCreate}>
						<PlusIcon className="h-4 w-4" />
						Nuevo gato
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

			{!loading && !error && gatos.length === 0 && (
				<EmptyState title="No hay gatos que mostrar" description="Prueba a cambiar el filtro o censa un nuevo gato." />
			)}

			{!loading && !error && gatos.length > 0 && (
				<div className={tableWrapperClass}>
					<table className={tableClass}>
						<thead className={theadClass}>
							<tr>
								<th className={thClass}>Foto</th>
								<th className={thClass}>Nombre</th>
								<th className={thClass}>Colonia</th>
								<th className={thClass}>Sexo</th>
								<th className={thClass}>Capa</th>
								<th className={thClass}>Estado</th>
								<th className={thClass}>Identificación</th>
								<th className={thClass}>
									<span className="sr-only">Acciones</span>
								</th>
							</tr>
						</thead>
						<tbody>
							{gatos.map((gato) => (
								<tr key={gato.id} className={trClass}>
									<td className={tdClass}>
										{gato.fotoUrl ? (
											<img src={gato.fotoUrl} alt="" className="h-10 w-10 rounded-md object-cover" />
										) : (
											<div className="h-10 w-10 rounded-md bg-slate-100" />
										)}
									</td>
									<td className={tdClass}>
										<Link to={`/gatos/${gato.id}`} className="font-medium text-teal-700 hover:underline">
											{gato.nombre ?? <span className="text-slate-400">Sin nombre</span>}
										</Link>
									</td>
									<td className={tdClass}>
										<Link to={`/colonias/${gato.coloniaId}`} className="font-medium text-teal-700 hover:underline">
											{coloniasById.get(String(gato.coloniaId))?.nombre ?? "—"}
										</Link>
									</td>
									<td className={tdClass}>{SEXO_LABELS[gato.sexo]}</td>
									<td className={tdClass}>{gato.capaPelaje}</td>
									<td className={tdClass}>
										<Badge className={ESTADO_CER_BADGE_CLASSES[gato.estadoCer]}>{ESTADO_CER_LABELS[gato.estadoCer]}</Badge>
									</td>
									<td className={tdClass}>
										<div className="flex items-center gap-2 text-xs text-slate-500">
											{gato.tieneMicrochip && (
												<span className="inline-flex items-center gap-1" title={gato.numMicrochip ?? "Con microchip"}>
													<CheckBadgeIcon className="h-4 w-4 text-teal-600" /> Chip
												</span>
											)}
											{gato.marcajeOreja && <span>Oreja marcada</span>}
										</div>
									</td>
									<td className={`${tdClass} text-right`}>
										<button
											type="button"
											onClick={() => openEdit(gato)}
											className="mr-3 font-medium text-teal-700 hover:underline"
										>
											Editar
										</button>
										<button
											type="button"
											onClick={() => setPendingDelete(gato)}
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
				<GatoFormModal key={editingGato?.id ?? "new"} open={formOpen} gato={editingGato} onClose={() => setFormOpen(false)} />
			)}

			<ConfirmDialog
				open={pendingDelete !== null}
				title="Eliminar gato"
				description={deleteError ?? `¿Seguro que quieres eliminar a "${pendingDelete?.nombre ?? "este gato"}" del censo?`}
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
