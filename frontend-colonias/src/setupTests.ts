import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

afterEach(() => {
	cleanup();
});

// jsdom no implementa ResizeObserver; Headless UI lo usa internamente para reposicionar el panel
// del Combobox al abrir/cerrar.
class ResizeObserverStub {
	observe() {}
	unobserve() {}
	disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;
