import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import { parse, print } from "graphql";
import type { DocumentNode } from "graphql";
import type { ApolloClient } from "@apollo/client";
import { CombinedGraphQLErrors } from "@apollo/client/errors";

const QUEUE_KEY = "colonias.offlineMutationQueue";

// Solo estas dos: son justo las que describe la Tabla 3.7 (visitas a comedero) y la Tabla 3.8
// (intervenciones médicas) como trabajo de campo que debe sobrevivir a la falta de cobertura.
// Las mutaciones de datos maestros (crear/editar/borrar colonia, gato, comedero...) se quedan
// FUERA a propósito: no forman parte de lo que la memoria promete, y reintentar a ciegas una
// operación destructiva (p. ej. un borrado) más tarde, sin que quien la pidió esté ya delante
// de la pantalla, es un riesgo que no vale la pena asumir sin que nadie lo haya pedido.
const OPERACIONES_ENCOLABLES = new Set(["RegistrarVisitaComedero", "RegistrarIntervencionMedica"]);

interface MutacionEncolada {
	operationName: string;
	// DocumentNode no es serializable tal cual (funciones, símbolos internos) - se guarda impreso
	// como texto GraphQL y se vuelve a parsear al reintentar.
	query: string;
	variables: Record<string, unknown>;
	queuedAt: string;
}

async function leerCola(): Promise<MutacionEncolada[]> {
	const raw = await AsyncStorage.getItem(QUEUE_KEY);
	return raw ? (JSON.parse(raw) as MutacionEncolada[]) : [];
}

function escribirCola(cola: MutacionEncolada[]): Promise<void> {
	return AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(cola));
}

export function esOperacionEncolable(operationName: string | undefined): operationName is string {
	return operationName !== undefined && OPERACIONES_ENCOLABLES.has(operationName);
}

// Se llama desde errorLink (apolloClient.ts) cuando una de las dos mutaciones de campo falla
// por un error que NO es de validación (ver ahí el porqué) - lo más habitual, sin cobertura.
export async function encolarMutacion(
	query: DocumentNode,
	variables: Record<string, unknown>,
	operationName: string,
): Promise<void> {
	const cola = await leerCola();
	cola.push({ operationName, query: print(query), variables, queuedAt: new Date().toISOString() });
	await escribirCola(cola);
}

let vaciando = false;

// Reintenta cada mutación pendiente, en el orden en que se guardaron. Una mutación que vuelve a
// fallar por red se queda en la cola para el próximo intento; una que el servidor rechaza por un
// motivo real (validación, el gato ya no existe...) se descarta - reintentarla eternamente no
// iba a arreglarse sola.
//
// Límite conocido y deliberadamente sin resolver aquí: si la respuesta original SÍ llegó a
// procesarse en el servidor pero la confirmación se perdió por el camino (el registro ya existe,
// solo que el cliente nunca se enteró), este reintento crea un duplicado. Evitarlo del todo
// exigiría una clave de idempotencia generada por el cliente y comprobada en el backend - un
// cambio de API que no se ha hecho; queda anotado como limitación conocida, no oculto.
export async function vaciarColaOffline(client: ApolloClient): Promise<void> {
	if (vaciando) return;
	vaciando = true;
	try {
		const cola = await leerCola();
		if (cola.length === 0) return;

		const pendientes: MutacionEncolada[] = [];
		for (const item of cola) {
			try {
				await client.mutate({ mutation: parse(item.query), variables: item.variables });
			} catch (err) {
				if (CombinedGraphQLErrors.is(err)) {
					continue; // error de negocio real: no se reintenta, se descarta
				}
				pendientes.push(item); // fallo de red: se conserva para el próximo intento
			}
		}
		await escribirCola(pendientes);
	} finally {
		vaciando = false;
	}
}

// Se llama una vez al arrancar la app (ver App.tsx). Vacía la cola tanto si ya hay conexión al
// abrir (por si quedó algo pendiente de una sesión anterior) como cada vez que NetInfo detecta
// que se recupera. Devuelve la función para des-suscribirse en el cleanup del efecto.
export function iniciarColaOffline(client: ApolloClient): () => void {
	void vaciarColaOffline(client);

	return NetInfo.addEventListener((state) => {
		if (state.isConnected) {
			void vaciarColaOffline(client);
		}
	});
}
