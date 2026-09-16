import { cloneElement, isValidElement } from "react";
import type { ReactNode } from "react";
import { fieldErrorId } from "../../lib/formValidation";

interface FieldProps {
	label: string;
	htmlFor: string;
	error?: string;
	required?: boolean;
	children: ReactNode;
	hint?: string;
}

function fieldHintId(htmlFor: string): string {
	return `${htmlFor}-hint`;
}

export function Field({ label, htmlFor, error, required, children, hint }: FieldProps) {
	const describedBy = error ? fieldErrorId(htmlFor) : hint ? fieldHintId(htmlFor) : undefined;

	// Solo se puede inyectar aria-invalid/aria-describedby automáticamente cuando el campo
	// envuelve un único control; los Field con varios hijos (p. ej. un mapa + inputs) siguen
	// mostrando el error en texto, pero cada control debe recibir esos atributos a mano.
	const control =
		isValidElement<{ "aria-invalid"?: boolean; "aria-describedby"?: string }>(children) && describedBy
			? cloneElement(children, {
					"aria-invalid": error ? true : undefined,
					"aria-describedby": describedBy,
				})
			: children;

	return (
		<div>
			<label htmlFor={htmlFor} className="mb-1 block text-sm font-medium text-slate-700">
				{label}
				{required && <span className="text-red-600"> *</span>}
			</label>
			{control}
			{hint && !error && (
				<p id={fieldHintId(htmlFor)} className="mt-1 text-xs text-slate-500">
					{hint}
				</p>
			)}
			{error && (
				<p id={fieldErrorId(htmlFor)} className="mt-1 text-xs text-red-600">
					{error}
				</p>
			)}
		</div>
	);
}
