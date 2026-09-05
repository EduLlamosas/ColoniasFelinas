import type { ButtonHTMLAttributes } from "react";
import { Spinner } from "./Spinner";

type Variant = "primary" | "secondary" | "danger" | "ghost";

const VARIANT_CLASSES: Record<Variant, string> = {
	primary: "bg-teal-700 text-white hover:bg-teal-800 focus-visible:outline-teal-700",
	secondary:
		"bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 focus-visible:outline-slate-400",
	danger: "bg-red-600 text-white hover:bg-red-700 focus-visible:outline-red-600",
	ghost: "text-slate-600 hover:bg-slate-100 focus-visible:outline-slate-400",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	variant?: Variant;
	loading?: boolean;
}

export function Button({
	variant = "primary",
	loading = false,
	disabled,
	className = "",
	children,
	...rest
}: ButtonProps) {
	return (
		<button
			className={`inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium shadow-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${VARIANT_CLASSES[variant]} ${className}`}
			disabled={disabled || loading}
			{...rest}
		>
			{loading && <Spinner size="sm" className="border-current border-t-transparent" />}
			{children}
		</button>
	);
}
