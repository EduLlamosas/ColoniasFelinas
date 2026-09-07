// Sin VITE_API_URL (el caso del build de Docker, que no lleva .env) las llamadas van a rutas
// relativas: Nginx sirve el estático y reenvía /graphql y /uploads al backend, así el mismo
// build funciona en cualquier dominio sin recompilar. En desarrollo local, `.env` fija
// VITE_API_URL=http://localhost:3000 para hablar directo con el backend dockerizado.
export const API_URL: string = import.meta.env.VITE_API_URL ?? "";
export const GRAPHQL_URL = `${API_URL}/graphql`;
export const UPLOADS_URL = `${API_URL}/uploads`;

// El backend guarda fotoUrl/urlCesionDatos con el host que tuviera APP_URL en el momento de
// la subida (p.ej. "http://localhost:3000" en un backend local) - válido para el entorno en el
// que se subió, pero no necesariamente para el que lo está viendo ahora (otro dispositivo en la
// LAN, otro dominio...). Sustituimos ese origin por el API_URL de este entorno, conservando el
// resto de la ruta (/uploads/xxx.webp). Mismo mecanismo que frontend-mobile/src/lib/config.ts.
export function resolveMediaUrl(url: string | null | undefined): string | null {
	if (!url) return null;
	return url.replace(/^https?:\/\/[^/]+/, API_URL);
}
