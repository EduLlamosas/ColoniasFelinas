import { describe, expect, it } from "vitest";
import { CombinedGraphQLErrors } from "@apollo/client/errors";
import { getErrorMessage, getGraphQLErrorCode } from "./graphqlErrors";

function combinedError(extensions: Record<string, unknown>, message = "Bad Request Exception") {
	return new CombinedGraphQLErrors({ errors: [{ message, extensions }] });
}

describe("getGraphQLErrorCode", () => {
	it("extrae el code de un CombinedGraphQLErrors", () => {
		const error = combinedError({ code: "BAD_REQUEST" });
		expect(getGraphQLErrorCode(error)).toBe("BAD_REQUEST");
	});

	it("devuelve undefined para errores que no son de Apollo", () => {
		expect(getGraphQLErrorCode(new Error("boom"))).toBeUndefined();
	});
});

describe("getErrorMessage", () => {
	it("sobrescribe UNAUTHENTICATED con un mensaje en español", () => {
		const error = combinedError({ code: "UNAUTHENTICATED" });
		expect(getErrorMessage(error)).toBe("Tu sesión ha caducado. Vuelve a iniciar sesión.");
	});

	it("sobrescribe FORBIDDEN con un mensaje en español", () => {
		const error = combinedError({ code: "FORBIDDEN" });
		expect(getErrorMessage(error)).toBe("No tienes permisos para realizar esta acción.");
	});

	it("usa el detalle de class-validator (string) cuando está presente", () => {
		const error = combinedError({
			code: "BAD_REQUEST",
			originalError: { message: "El DNI ya está en uso" },
		});
		expect(getErrorMessage(error)).toBe("El DNI ya está en uso");
	});

	it("une el detalle de class-validator cuando es un array de mensajes", () => {
		const error = combinedError({
			code: "BAD_REQUEST",
			originalError: { message: ["El nombre es obligatorio", "El DNI no es válido"] },
		});
		expect(getErrorMessage(error)).toBe("El nombre es obligatorio El DNI no es válido");
	});

	it("cae al message de nivel superior si no hay originalError", () => {
		const error = combinedError({ code: "CONFLICT" }, "Ya existe una colonia con ese código");
		expect(getErrorMessage(error)).toBe("Ya existe una colonia con ese código");
	});

	it("devuelve el message de un Error normal", () => {
		expect(getErrorMessage(new Error("fallo de red"))).toBe("fallo de red");
	});

	it("devuelve un mensaje genérico para valores desconocidos", () => {
		expect(getErrorMessage("algo raro")).toBe("Ha ocurrido un error inesperado.");
		expect(getErrorMessage(undefined)).toBe("Ha ocurrido un error inesperado.");
	});
});
