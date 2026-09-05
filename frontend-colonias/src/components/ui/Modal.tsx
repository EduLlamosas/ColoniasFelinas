import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from "@headlessui/react";
import type { ReactNode } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";

interface ModalProps {
	open: boolean;
	onClose: () => void;
	title: string;
	children: ReactNode;
	widthClassName?: string;
}

export function Modal({ open, onClose, title, children, widthClassName = "max-w-lg" }: ModalProps) {
	return (
		// z-[1100]: por encima de los controles de Leaflet (z-index: 1000, el más alto que usa la
		// librería), para que un modal abierto encima de un mapa no quede tapado por sus controles.
		<Dialog open={open} onClose={onClose} transition className="relative z-[1100]">
			<DialogBackdrop
				transition
				className="fixed inset-0 bg-slate-900/40 duration-150 ease-out data-[closed]:opacity-0"
			/>
			<div className="fixed inset-0 flex w-screen items-center justify-center p-4">
				<DialogPanel
					transition
					className={`w-full ${widthClassName} rounded-lg bg-white shadow-xl duration-150 ease-out data-[closed]:scale-95 data-[closed]:opacity-0`}
				>
					<div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
						<DialogTitle className="text-base font-semibold text-slate-900">{title}</DialogTitle>
						<button
							type="button"
							onClick={onClose}
							className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
							aria-label="Cerrar"
						>
							<XMarkIcon className="h-5 w-5" />
						</button>
					</div>
					<div className="max-h-[75vh] overflow-y-auto px-5 py-4">{children}</div>
				</DialogPanel>
			</div>
		</Dialog>
	);
}
