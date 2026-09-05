import type { SelectHTMLAttributes } from "react";

export function Select({ className = "", children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
	return (
		<select
			className={`block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-600/40 disabled:bg-slate-100 disabled:text-slate-500 ${className}`}
			{...rest}
		>
			{children}
		</select>
	);
}
