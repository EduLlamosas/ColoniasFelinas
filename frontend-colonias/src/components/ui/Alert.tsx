import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";

export function Alert({ message }: { message: string }) {
	return (
		<div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
			<ExclamationTriangleIcon className="mt-0.5 h-4 w-4 shrink-0" />
			<span>{message}</span>
		</div>
	);
}
