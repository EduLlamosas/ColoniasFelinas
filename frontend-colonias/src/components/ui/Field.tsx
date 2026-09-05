import type { ReactNode } from "react";

interface FieldProps {
	label: string;
	htmlFor: string;
	error?: string;
	required?: boolean;
	children: ReactNode;
	hint?: string;
}

export function Field({ label, htmlFor, error, required, children, hint }: FieldProps) {
	return (
		<div>
			<label htmlFor={htmlFor} className="mb-1 block text-sm font-medium text-slate-700">
				{label}
				{required && <span className="text-red-600"> *</span>}
			</label>
			{children}
			{hint && !error && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
			{error && <p className="mt-1 text-xs text-red-600">{error}</p>}
		</div>
	);
}
