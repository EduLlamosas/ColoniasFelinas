import type { EstadoCer, RolUsuario, Sexo, TipoSuelo } from "../types/graphql";

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

export const ESTADO_CER_BADGE_CLASSES: Record<EstadoCer, string> = {
	AVISTADO: "bg-amber-100 text-amber-800",
	CAPTURADO: "bg-orange-100 text-orange-800",
	ESTERILIZADO: "bg-teal-100 text-teal-800",
	RETORNADO: "bg-sky-100 text-sky-800",
	ADOPTADO: "bg-emerald-100 text-emerald-800",
};


export const ROL_USUARIO_LABELS: Record<RolUsuario, string> = {
	ADMINISTRADOR: "Administrador",
	GESTOR: "Gestor",
};

function toOptions<T extends string>(labels: Record<T, string>): { value: T; label: string }[] {
	return (Object.keys(labels) as T[]).map((value) => ({ value, label: labels[value] }));
}

export const TIPO_SUELO_OPTIONS = toOptions(TIPO_SUELO_LABELS);
export const SEXO_OPTIONS = toOptions(SEXO_LABELS);
export const ESTADO_CER_OPTIONS = toOptions(ESTADO_CER_LABELS);
