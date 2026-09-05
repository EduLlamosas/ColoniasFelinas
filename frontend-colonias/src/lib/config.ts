// Sin VITE_API_URL (el caso del build de Docker, que no lleva .env) las llamadas van a rutas
// relativas: Nginx sirve el estático y reenvía /graphql y /uploads al backend, así el mismo
// build funciona en cualquier dominio sin recompilar. En desarrollo local, `.env` fija
// VITE_API_URL=http://localhost:3000 para hablar directo con el backend dockerizado.
export const API_URL: string = import.meta.env.VITE_API_URL ?? "";
export const GRAPHQL_URL = `${API_URL}/graphql`;
export const UPLOADS_URL = `${API_URL}/uploads`;
