jest.mock("./config", () => ({ UPLOADS_URL: "http://test.local/uploads" }));
jest.mock("./authStorage", () => ({ getStoredToken: jest.fn().mockResolvedValue(null) }));

const mockManipulateAsync = jest.fn();
jest.mock("expo-image-manipulator", () => ({
	manipulateAsync: (...args: unknown[]) => mockManipulateAsync(...args),
	SaveFormat: { JPEG: "jpeg" },
}));

const mockUploadAsync = jest.fn();
jest.mock("expo-file-system/legacy", () => ({
	uploadAsync: (...args: unknown[]) => mockUploadAsync(...args),
	FileSystemUploadType: { MULTIPART: "multipart" },
}));

import { uploadImage } from "./uploads";

beforeEach(() => {
	mockManipulateAsync.mockReset();
	mockUploadAsync.mockReset();
	mockUploadAsync.mockResolvedValue({
		status: 200,
		body: JSON.stringify({ url: "http://test.local/uploads/foo.webp" }),
	});
});

// Regresión: el front no debe recomprimir/reformatear más de lo estrictamente necesario para
// redimensionar (ver comentario en uploads.ts) - esto evita volver a la doble compresión con
// pérdida que teníamos antes (picker a 0.8 + manipulator a 0.8 + backend a WEBP 80).
describe("uploadImage", () => {
	it("no pasa la imagen por el manipulador si ya cabe en el ancho máximo", async () => {
		const url = await uploadImage({ uri: "file://small.jpg", width: 800, mimeType: "image/png" });

		expect(mockManipulateAsync).not.toHaveBeenCalled();
		expect(mockUploadAsync).toHaveBeenCalledWith(
			"http://test.local/uploads",
			"file://small.jpg",
			expect.objectContaining({ mimeType: "image/png" }),
		);
		expect(url).toBe("http://test.local/uploads/foo.webp");
	});

	it("redimensiona a calidad máxima (sin recomprimir) si la imagen supera el ancho máximo", async () => {
		mockManipulateAsync.mockResolvedValue({ uri: "file://resized.jpg" });

		await uploadImage({ uri: "file://big.jpg", width: 4000, mimeType: "image/jpeg" });

		expect(mockManipulateAsync).toHaveBeenCalledWith(
			"file://big.jpg",
			[{ resize: { width: 1600 } }],
			expect.objectContaining({ compress: 1 }),
		);
		expect(mockUploadAsync).toHaveBeenCalledWith(
			"http://test.local/uploads",
			"file://resized.jpg",
			expect.objectContaining({ mimeType: "image/jpeg" }),
		);
	});

	it("redimensiona si no se conoce el ancho original (por si acaso es demasiado grande)", async () => {
		mockManipulateAsync.mockResolvedValue({ uri: "file://resized.jpg" });

		await uploadImage({ uri: "file://unknown-size.jpg" });

		expect(mockManipulateAsync).toHaveBeenCalled();
	});

	it("lanza un error legible cuando el backend responde con un status de error", async () => {
		mockUploadAsync.mockResolvedValue({
			status: 400,
			body: JSON.stringify({ message: "Solo se permiten imágenes JPEG, PNG o WEBP" }),
		});

		await expect(uploadImage({ uri: "file://small.jpg", width: 100 })).rejects.toThrow(
			"Solo se permiten imágenes JPEG, PNG o WEBP",
		);
	});
});
