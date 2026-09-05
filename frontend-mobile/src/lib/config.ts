import { Platform } from "react-native";

// El emulador de Android no ve "localhost" como el propio PC: 10.0.2.2 es el alias que
// redirige al host. En un móvil físico ninguno de los dos vale, hay que fijar la IP de
// la LAN en EXPO_PUBLIC_API_URL (frontend-mobile/.env). iOS Simulator sí resuelve
// localhost directo, pero de momento el proyecto solo se prueba en Android.
const DEFAULT_URL = Platform.OS === "android" ? "http://10.0.2.2:3000" : "http://localhost:3000";

export const API_URL: string = process.env.EXPO_PUBLIC_API_URL ?? DEFAULT_URL;
export const GRAPHQL_URL = `${API_URL}/graphql`;
export const UPLOADS_URL = `${API_URL}/uploads`;

// El backend construye fotoUrl con un APP_URL fijo ("http://localhost:3000" en su .env),
// pensado para un navegador en el mismo PC. Desde un móvil ese host no resuelve a nada,
// así que sustituimos el origin por el API_URL que sí sabemos que es alcanzable,
// conservando el resto de la ruta (/uploads/xxx.webp).
export function resolveMediaUrl(url: string | null | undefined): string | null {
	if (!url) return null;
	return url.replace(/^https?:\/\/[^/]+/, API_URL);
}
