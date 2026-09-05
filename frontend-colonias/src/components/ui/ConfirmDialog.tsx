import { Modal } from "./Modal";
import { Button } from "./Button";

interface ConfirmDialogProps {
	open: boolean;
	title: string;
	description: string;
	confirmLabel?: string;
	loading?: boolean;
	onConfirm: () => void;
	onCancel: () => void;
}

export function ConfirmDialog({
	open,
	title,
	description,
	confirmLabel = "Eliminar",
	loading = false,
	onConfirm,
	onCancel,
}: ConfirmDialogProps) {
	return (
		<Modal open={open} onClose={onCancel} title={title} widthClassName="max-w-sm">
			<p className="text-sm text-slate-600">{description}</p>
			<div className="mt-5 flex justify-end gap-2">
				<Button variant="secondary" onClick={onCancel} disabled={loading}>
					Cancelar
				</Button>
				<Button variant="danger" onClick={onConfirm} loading={loading}>
					{confirmLabel}
				</Button>
			</div>
		</Modal>
	);
}
