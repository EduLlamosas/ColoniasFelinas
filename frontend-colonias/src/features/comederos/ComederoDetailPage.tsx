import { useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery } from "@apollo/client/react";
import { ArrowLeftIcon, PencilSquareIcon, PhotoIcon, TrashIcon } from "@heroicons/react/24/outline";
import { Spinner } from "../../components/ui/Spinner";
import { Alert } from "../../components/ui/Alert";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { getErrorMessage } from "../../lib/graphqlErrors";
import { COMEDEROS_QUERY, REMOVE_COMEDERO_MUTATION } from "./comederos.graphql";
import { ComederoFormModal } from "./ComederoFormModal";
import { useColoniasLookup } from "../colonias/useColoniasLookup";
import type { Comedero } from "../../types/graphql";

export function ComederoDetailPage() {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();
	const { data, loading, error } = useQuery<{ comederos: Comedero[] }>(COMEDEROS_QUERY);
	const { byId: coloniasById } = useColoniasLookup();
	const [editOpen, setEditOpen] = useState(false);
	const [pendingDelete, setPendingDelete] = useState(false);
	const [deleteError, setDeleteError] = useState<string | null>(null);
	const [removeComedero, { loading: deleting }] = useMutation(REMOVE_COMEDERO_MUTATION, {
		refetchQueries: ["Comederos"],
	});

	if (!id) return <Navigate to="/comederos" replace />;

	if (loading) {
		return (
			<div className="flex justify-center py-14">
				<Spinner size="lg" />
			</div>
		);
	}

	if (error) return <Alert message={getErrorMessage(error)} />;

	const comedero = data?.comederos.find((c) => c.id === id);

	if (!comedero) {
		return <EmptyState title="Comedero no encontrado" description="Puede que haya sido eliminado." />;
	}

	const colonia = coloniasById.get(String(comedero.coloniaId));

	async function confirmDelete() {
		setDeleteError(null);
		try {
			await removeComedero({ variables: { id } });
			navigate("/comederos");
		} catch (err) {
			setDeleteError(getErrorMessage(err));
		}
	}

	return (
		<div>
			<Link to="/comederos" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
				<ArrowLeftIcon className="h-4 w-4" />
				Volver a comederos
			</Link>

			<div className="mb-6 flex flex-wrap items-start justify-between gap-3">
				<div>
					<h1 className="text-xl font-semibold text-slate-900">{comedero.ubicacionDetallada}</h1>
					<p className="mt-1 text-sm text-slate-500">
						{colonia ? (
							<>
								En{" "}
								<Link to={`/colonias/${colonia.id}`} className="text-teal-700 hover:underline">
									{colonia.nombre}
								</Link>
							</>
						) : (
							"Sin colonia asociada"
						)}
					</p>
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

			<div className="flex max-w-md items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
				{comedero.fotoUrl ? (
					<img src={comedero.fotoUrl} alt="" className="h-64 w-full object-cover" />
				) : (
					<PhotoIcon className="h-16 w-16 text-slate-300" />
				)}
			</div>

			{editOpen && <ComederoFormModal open={editOpen} comedero={comedero} onClose={() => setEditOpen(false)} />}

			<ConfirmDialog
				open={pendingDelete}
				title="Eliminar comedero"
				description={deleteError ?? "¿Seguro que quieres eliminar este comedero?"}
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
