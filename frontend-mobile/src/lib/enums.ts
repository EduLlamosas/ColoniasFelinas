import type { EstadoCer, Sexo, TipoEventoClinico, TipoSuelo } from "../types/graphql";

export const TIPO_SUELO_LABELS: Record<TipoSuelo, string> = {
	URBANO: "Urbano",
	RURAL: "Rural",
	INDUSTRIAL: "Industrial",
};

export const SEXO_LABELS: Record<Sexo, string> = {
	MACHO: "Macho",
	HEMBRA: "Hembra",
	DESCONOCIDO: "Desconocido",
};

export const ESTADO_CER_LABELS: Record<EstadoCer, string> = {
	AVISTADO: "Avistado",
	CAPTURADO: "Capturado",
	ESTERILIZADO: "Esterilizado",
	RETORNADO: "Retornado",
	ADOPTADO: "Adoptado",
};

export const TIPO_EVENTO_CLINICO_LABELS: Record<TipoEventoClinico, string> = {
	ESTERILIZACION: "Esterilización",
	VACUNACION: "Vacunación",
	TEST_ENFERMEDAD: "Test de enfermedad",
	TRATAMIENTO_ESPECIAL: "Tratamiento especial",
};

export const ROL_ASIGNADO_SUGERENCIAS = ["Alimentador principal", "Supervisor", "Capturador"];
