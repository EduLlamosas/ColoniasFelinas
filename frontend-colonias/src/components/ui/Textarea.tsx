import type { TextareaHTMLAttributes } from "react";

export function Textarea({ className = "", ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
	return (
		<textarea
			className={`block w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600/40 ${className}`}
			rows={3}
			{...rest}
		/>
	);
}
