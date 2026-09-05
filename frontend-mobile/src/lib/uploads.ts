import * as ImageManipulator from "expo-image-manipulator";
import * as FileSystem from "expo-file-system/legacy";
import { UPLOADS_URL } from "./config";
import { getStoredToken } from "./authStorage";

interface UploadResponse {
	url: string;
}

interface PickedImage {
	uri: string;
	width?: number;
	mimeType?: string | null;
}

// Debe coincidir con MAX_WIDTH en backend/src/uploads/uploads.controller.ts: redimensionar aquí
// es solo para no subir megapíxeles de más por una red móvil. La calidad/formato de salida los
// decide el backend en una única pasada (a WEBP); si el front también recomprimiera o reformateara
// aquí, la imagen pasaría por dos recodificaciones con pérdida en vez de una, perdiendo info de más.
const MAX_UPLOAD_WIDTH = 1600;

async function resizeForUpload(image: PickedImage): Promise<{ uri: string; mimeType: string }> {
	if (image.width && image.width <= MAX_UPLOAD_WIDTH) {
		// Ya cabe dentro del límite: se sube tal cual, sin pasarla por el manipulador (que
		// siempre reescribe/recodea el archivo aunque no se le pida ningún cambio real).
		return { uri: image.uri, mimeType: image.mimeType ?? "image/jpeg" };
	}
	// compress: 1 = sin reducción de calidad deliberada; el único "recomprimido" que ocurre aquí
	// es el inevitable al reescribir píxeles tras cambiar el tamaño, no una decisión de compresión.
	const result = await ImageManipulator.manipulateAsync(image.uri, [{ resize: { width: MAX_UPLOAD_WIDTH } }], {
		compress: 1,
		format: ImageManipulator.SaveFormat.JPEG,
	});
	return { uri: result.uri, mimeType: "image/jpeg" };
}

export async function uploadImage(image: PickedImage): Promise<string> {
	const resized = await resizeForUpload(image);
	const token = await getStoredToken();

	// FileSystem.uploadAsync codifica el multipart de forma nativa (sin pasar por fetch/Blob/
	// FormData de JS), evitando toda la fragilidad del runtime "Winter" de Expo SDK 57 con el
	// que nos topamos antes (FormData no soportado, Blob sin type, etc).
	const result = await FileSystem.uploadAsync(UPLOADS_URL, resized.uri, {
		httpMethod: "POST",
		uploadType: FileSystem.FileSystemUploadType.MULTIPART,
		fieldName: "file",
		mimeType: resized.mimeType,
		headers: token ? { Authorization: `Bearer ${token}` } : undefined,
	});

	if (result.status < 200 || result.status >= 300) {
		let message: string | undefined;
		try {
			message = (JSON.parse(result.body) as { message?: string }).message;
		} catch {
			// respuesta no-JSON (p.ej. error 502 de un proxy), se usa el mensaje genérico
		}
		throw new Error(message ?? "No se pudo subir la imagen");
	}

	// Se devuelve tal cual la manda el backend (con su APP_URL fijo) para no guardar en la
	// colonia una IP de red específica de este dispositivo: la normalización a un host
	// alcanzable (resolveMediaUrl) es solo cosa de la pantalla que la muestra.
	const data = JSON.parse(result.body) as UploadResponse;
	return data.url;
}
