import type { InputHTMLAttributes } from "react";

interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
	invalid?: boolean;
}

export function TextInput({ invalid, className = "", ...rest }: TextInputProps) {
	return (
		<input
			className={`block w-full rounded-md border px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600/40 disabled:bg-slate-100 disabled:text-slate-500 ${
				invalid ? "border-red-400" : "border-slate-300"
			} ${className}`}
			{...rest}
		/>
	);
}
