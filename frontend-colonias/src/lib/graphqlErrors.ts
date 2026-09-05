import { CombinedGraphQLErrors } from "@apollo/client/errors";

// El backend ya devuelve mensajes en español para BAD_REQUEST/NOT_FOUND/CONFLICT (validación de
// datos y errores de Prisma), así que esos se muestran tal cual. UNAUTHENTICATED/FORBIDDEN vienen
// de los guards de Nest con mensajes genéricos en inglés ("Unauthorized"), así que se sobrescriben.
const MESSAGES_BY_CODE: Record<string, string> = {
	UNAUTHENTICATED: "Tu sesión ha caducado. Vuelve a iniciar sesión.",
	FORBIDDEN: "No tienes permisos para realizar esta acción.",
};

export function getGraphQLErrorCode(error: unknown): string | undefined {
	if (CombinedGraphQLErrors.is(error)) {
		const code = error.errors[0]?.extensions?.code;
		return typeof code === "string" ? code : undefined;
	}
	return undefined;
}

// El ValidationPipe de Nest (class-validator) mete el detalle real por campo en
// extensions.originalError.message (string o array de strings); el "message" de nivel superior
// que ve Apollo es solo el nombre genérico de la excepción ("Bad Request Exception").
function getOriginalErrorDetail(extensions: Record<string, unknown> | undefined): string | undefined {
	const originalError = extensions?.originalError as { message?: string | string[] } | undefined;
	const detail = originalError?.message;
	if (Array.isArray(detail)) return detail.join(" ");
	if (typeof detail === "string") return detail;
	return undefined;
}

export function getErrorMessage(error: unknown): string {
	if (CombinedGraphQLErrors.is(error)) {
		const firstError = error.errors[0];
		const code = getGraphQLErrorCode(error);
		if (code && MESSAGES_BY_CODE[code]) {
			return MESSAGES_BY_CODE[code];
		}
		return (
			getOriginalErrorDetail(firstError?.extensions) ?? firstError?.message ?? "Ha ocurrido un error inesperado."
		);
	}
	if (error instanceof Error) {
		return error.message;
	}
	return "Ha ocurrido un error inesperado.";
}
