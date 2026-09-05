import { UPLOADS_URL } from "./config";
import { getStoredToken } from "./authStorage";

interface UploadResponse {
	url: string;
}

// Debe coincidir con MAX_WIDTH en backend/src/uploads/uploads.controller.ts: redimensionar aquí
// es solo para no subir megapíxeles de más. La calidad/formato de salida los decide el backend en
// una única pasada (a WEBP); si aquí también recomprimiéramos o reformateáramos, la imagen pasaría
// por dos recodificaciones con pérdida en vez de una.
const MAX_UPLOAD_WIDTH = 1600;

async function resizeIfNeeded(file: File): Promise<Blob> {
	const bitmap = await createImageBitmap(file);
	try {
		if (bitmap.width <= MAX_UPLOAD_WIDTH) {
			return file;
		}
		const canvas = document.createElement("canvas");
		canvas.width = MAX_UPLOAD_WIDTH;
		canvas.height = Math.round((bitmap.height / bitmap.width) * MAX_UPLOAD_WIDTH);
		const ctx = canvas.getContext("2d");
		if (!ctx) return file;
		ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
		return await new Promise<Blob>((resolve, reject) => {
			// quality: 1 = sin reducción deliberada; el único recodificado que ocurre aquí es el
			// inevitable al reescribir píxeles tras cambiar el tamaño, no una decisión de compresión.
			canvas.toBlob(
				(blob) => (blob ? resolve(blob) : reject(new Error("No se pudo procesar la imagen"))),
				file.type || "image/jpeg",
				1,
			);
		});
	} finally {
		bitmap.close();
	}
}

export async function uploadImage(file: File): Promise<string> {
	const token = getStoredToken();
	const formData = new FormData();
	const payload = await resizeIfNeeded(file);
	formData.append("file", payload, file.name);

	const response = await fetch(UPLOADS_URL, {
		method: "POST",
		headers: token ? { Authorization: `Bearer ${token}` } : undefined,
		body: formData,
	});

	if (!response.ok) {
		const body = (await response.json().catch(() => null)) as { message?: string } | null;
		throw new Error(body?.message ?? "No se pudo subir la imagen");
	}

	const data = (await response.json()) as UploadResponse;
	return data.url;
}
