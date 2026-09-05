import type { ReactNode } from "react";

export function Badge({ children, className = "" }: { children: ReactNode; className?: string }) {
	return (
		<span
			className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${className || "bg-slate-100 text-slate-700"}`}
		>
			{children}
		</span>
	);
}
