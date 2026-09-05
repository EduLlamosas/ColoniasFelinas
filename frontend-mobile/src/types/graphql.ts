export type TipoSuelo = "URBANO" | "RURAL" | "INDUSTRIAL";
export type Sexo = "MACHO" | "HEMBRA" | "DESCONOCIDO";
export type EstadoCer = "AVISTADO" | "CAPTURADO" | "ESTERILIZADO" | "RETORNADO" | "ADOPTADO";
export type RolUsuario = "ADMINISTRADOR" | "GESTOR";

export interface Usuario {
	id: string;
	email: string;
	nombreCompleto: string;
	rol: RolUsuario;
	createdAt: string;
	updatedAt: string;
}

export interface AuthPayload {
	accessToken: string;
	usuario: Usuario;
}

export interface Colonia {
	id: string;
	codigoOficial: string;
	nombre: string;
	tipoSuelo: TipoSuelo;
	latitud: number;
	longitud: number;
	observaciones: string | null;
	fotoUrl: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface Comedero {
	id: string;
	coloniaId: number;
	ubicacionDetallada: string;
	fotoUrl: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface Gato {
	id: string;
	coloniaId: number;
	nombre: string | null;
	sexo: Sexo;
	fechaNacimiento: string | null;
	capaPelaje: string;
	estadoCer: EstadoCer;
	tieneMicrochip: boolean;
	numMicrochip: string | null;
	marcajeOreja: boolean;
	fotoUrl: string | null;
	observaciones: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface Voluntario {
	id: string;
	dni: string;
	nombre: string;
	telefono: string | null;
	urlCesionDatos: string;
	createdAt: string;
	updatedAt: string;
}

export interface Asignacion {
	voluntarioId: number;
	coloniaId: number;
	rolAsignado: string;
	createdAt: string;
}
