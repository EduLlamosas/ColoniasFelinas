import { useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery } from "@apollo/client/react";
import { ArrowLeftIcon, CheckBadgeIcon, PencilSquareIcon, PhotoIcon, TrashIcon } from "@heroicons/react/24/outline";
import { Spinner } from "../../components/ui/Spinner";
import { Alert } from "../../components/ui/Alert";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { ESTADO_CER_BADGE_CLASSES, ESTADO_CER_LABELS, SEXO_LABELS } from "../../lib/enums";
import { getErrorMessage } from "../../lib/graphqlErrors";
import { GATOS_QUERY, REMOVE_GATO_MUTATION } from "./gatos.graphql";
import { GatoFormModal } from "./GatoFormModal";
import { useColoniasLookup } from "../colonias/useColoniasLookup";
import type { Gato } from "../../types/graphql";

export function GatoDetailPage() {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();
	const { data, loading, error } = useQuery<{ gatos: Gato[] }>(GATOS_QUERY);
	const { byId: coloniasById } = useColoniasLookup();
	const [editOpen, setEditOpen] = useState(false);
	const [pendingDelete, setPendingDelete] = useState(false);
	const [deleteError, setDeleteError] = useState<string | null>(null);
	const [removeGato, { loading: deleting }] = useMutation(REMOVE_GATO_MUTATION, {
		refetchQueries: ["Gatos"],
	});

	if (!id) return <Navigate to="/gatos" replace />;

	if (loading) {
		return (
			<div className="flex justify-center py-14">
				<Spinner size="lg" />
			</div>
		);
	}

	if (error) return <Alert message={getErrorMessage(error)} />;

	const gato = data?.gatos.find((g) => g.id === id);

	if (!gato) {
		return <EmptyState title="Gato no encontrado" description="Puede que haya sido eliminado." />;
	}

	const colonia = coloniasById.get(String(gato.coloniaId));

	async function confirmDelete() {
		setDeleteError(null);
		try {
			await removeGato({ variables: { id } });
			navigate("/gatos");
		} catch (err) {
			setDeleteError(getErrorMessage(err));
		}
	}

	return (
		<div>
			<Link to="/gatos" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
				<ArrowLeftIcon className="h-4 w-4" />
				Volver a gatos
			</Link>

			<div className="mb-6 flex flex-wrap items-start justify-between gap-3">
				<div>
					<h1 className="text-xl font-semibold text-slate-900">{gato.nombre ?? "Sin nombre"}</h1>
					<p className="mt-1 text-sm text-slate-500">
						{colonia ? (
							<>
								Censado en{" "}
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

			<div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
				<div className="flex items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50 lg:col-span-1">
					{gato.fotoUrl ? (
						<img src={gato.fotoUrl} alt="" className="h-64 w-full object-cover" />
					) : (
						<PhotoIcon className="h-16 w-16 text-slate-300" />
					)}
				</div>

				<div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
					<h2 className="mb-3 text-sm font-semibold text-slate-900">Ficha felina</h2>
					<dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
						<div>
							<dt className="text-slate-500">Sexo</dt>
							<dd className="text-slate-700">{SEXO_LABELS[gato.sexo]}</dd>
						</div>
						<div>
							<dt className="text-slate-500">Capa de pelaje</dt>
							<dd className="text-slate-700">{gato.capaPelaje}</dd>
						</div>
						<div>
							<dt className="text-slate-500">Fecha de nacimiento estimada</dt>
							<dd className="text-slate-700">
								{gato.fechaNacimiento ? new Date(gato.fechaNacimiento).toLocaleDateString("es-ES") : "Desconocida"}
							</dd>
						</div>
						<div>
							<dt className="text-slate-500">Estado (protocolo CER)</dt>
							<dd>
								<Badge className={ESTADO_CER_BADGE_CLASSES[gato.estadoCer]}>{ESTADO_CER_LABELS[gato.estadoCer]}</Badge>
							</dd>
						</div>
						<div>
							<dt className="text-slate-500">Marcaje en la oreja</dt>
							<dd className="text-slate-700">{gato.marcajeOreja ? "Sí" : "No"}</dd>
						</div>
						<div className="col-span-2">
							<dt className="text-slate-500">Microchip</dt>
							<dd className="flex items-center gap-1.5 text-slate-700">
								{gato.tieneMicrochip ? (
									<>
										<CheckBadgeIcon className="h-4 w-4 text-teal-600" />
										{gato.numMicrochip ?? "Con microchip, sin número registrado"}
									</>
								) : (
									"Sin microchip"
								)}
							</dd>
						</div>
					</dl>
					{gato.observaciones && (
						<div className="mt-4 border-t border-slate-100 pt-4 text-sm">
							<dt className="text-slate-500">Observaciones</dt>
							<dd className="mt-1 whitespace-pre-line text-slate-700">{gato.observaciones}</dd>
						</div>
					)}
				</div>
			</div>

			{editOpen && <GatoFormModal open={editOpen} gato={gato} onClose={() => setEditOpen(false)} />}

			<ConfirmDialog
				open={pendingDelete}
				title="Eliminar gato"
				description={deleteError ?? `¿Seguro que quieres eliminar a "${gato.nombre ?? "este gato"}" del censo?`}
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
