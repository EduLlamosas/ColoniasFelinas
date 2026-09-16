export type FieldErrors = Record<string, string>;

export function fieldErrorId(htmlFor: string): string {
	return `${htmlFor}-error`;
}

// El orden de las claves en `errors` debe seguir el orden visual del formulario (de arriba
// a abajo) para que el foco salte al primer campo erróneo, no a uno cualquiera.
export function focusFirstInvalidField(errors: FieldErrors): void {
	const [firstFieldId] = Object.keys(errors);
	if (!firstFieldId) return;
	document.getElementById(firstFieldId)?.focus();
}
