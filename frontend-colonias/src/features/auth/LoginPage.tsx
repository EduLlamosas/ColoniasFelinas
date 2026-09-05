import { useState } from "react";
import type { FormEvent } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import type { Location } from "react-router-dom";
import { useAuth } from "./useAuth";
import { getErrorMessage } from "../../lib/graphqlErrors";
import { Button } from "../../components/ui/Button";
import { Field } from "../../components/ui/Field";
import { TextInput } from "../../components/ui/TextInput";
import { Alert } from "../../components/ui/Alert";

export function LoginPage() {
	const { isAuthenticated, initializing, login } = useAuth();
	const navigate = useNavigate();
	const location = useLocation();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);

	if (!initializing && isAuthenticated) {
		const from = (location.state as { from?: Location } | null)?.from;
		return <Navigate to={from?.pathname ?? "/colonias"} replace />;
	}

	async function handleSubmit(event: FormEvent) {
		event.preventDefault();
		setError(null);
		setSubmitting(true);
		try {
			await login(email, password);
			navigate("/colonias", { replace: true });
		} catch (err) {
			setError(getErrorMessage(err));
		} finally {
			setSubmitting(false);
		}
	}

	return (
		<div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
			<div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
				<div className="mb-6 text-center">
					<h1 className="text-lg font-semibold text-slate-900">Colonias Felinas</h1>
					<p className="mt-1 text-sm text-slate-500">Panel de gestión municipal</p>
				</div>
				<form onSubmit={handleSubmit} className="space-y-4">
					<Field label="Correo electrónico" htmlFor="email" required>
						<TextInput
							id="email"
							type="email"
							autoComplete="username"
							required
							value={email}
							onChange={(e) => setEmail(e.target.value)}
						/>
					</Field>
					<Field label="Contraseña" htmlFor="password" required>
						<TextInput
							id="password"
							type="password"
							autoComplete="current-password"
							required
							value={password}
							onChange={(e) => setPassword(e.target.value)}
						/>
					</Field>
					{error && <Alert message={error} />}
					<Button type="submit" className="w-full" loading={submitting}>
						Iniciar sesión
					</Button>
				</form>
			</div>
		</div>
	);
}
