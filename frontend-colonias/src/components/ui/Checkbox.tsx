import type { InputHTMLAttributes } from "react";

interface CheckboxProps extends InputHTMLAttributes<HTMLInputElement> {
	label: string;
}

export function Checkbox({ label, id, className = "", ...rest }: CheckboxProps) {
	return (
		<label htmlFor={id} className={`flex items-center gap-2 text-sm text-slate-700 ${className}`}>
			<input
				id={id}
				type="checkbox"
				className="h-4 w-4 rounded border-slate-300 text-teal-700 focus:ring-teal-600/40"
				{...rest}
			/>
			{label}
		</label>
	);
}
