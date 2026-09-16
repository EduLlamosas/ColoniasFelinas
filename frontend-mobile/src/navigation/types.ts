import type { CompositeScreenProps, NavigatorScreenParams } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";

// "Volver" desde una pantalla de detalle alcanzada saltando de pestaña (p. ej. detalle de
// colonia -> detalle de gato) tiene que devolver a la pantalla de origen concreta, no al
// listado de la pestaña activa - navigation.goBack() por sí solo hace pop dentro del stack de
// la pestaña ACTUAL, que normalmente es solo [XList, XDetail], así que siempre "vuelve" al
// listado. Cuando se llega por salto de pestaña, ese origen viaja en este param `from`; la
// pantalla de destino navega explícitamente a él en vez de hacer goBack(). Si no hay `from`
// (se llegó por navegación normal dentro de la misma pestaña), goBack() ya es correcto.
export type BackTarget =
	| { tab: "ColoniasTab"; screen: "ColoniaDetail"; params: { id: string } }
	| { tab: "GatosTab"; screen: "GatoDetail"; params: { id: string } }
	| { tab: "ComederosTab"; screen: "ComederoDetail"; params: { id: string } };

export type ColoniasStackParamList = {
	ColoniasList: undefined;
	ColoniaDetail: { id: string; from?: BackTarget };
	ColoniaForm: { id?: string } | undefined;
};

export type GatosStackParamList = {
	GatosList: undefined;
	GatoDetail: { id: string; from?: BackTarget };
	GatoForm: { id?: string; defaultColoniaId?: string } | undefined;
};

export type ComederosStackParamList = {
	ComederosList: undefined;
	ComederoDetail: { id: string; from?: BackTarget };
	ComederoForm: { id?: string; defaultColoniaId?: string } | undefined;
};

export type VoluntariosStackParamList = {
	VoluntariosList: undefined;
	VoluntarioDetail: { id: string };
	VoluntarioForm: { id?: string } | undefined;
	// Ambos ids presentes = editar una asignación existente (solo se puede cambiar el rol).
	// Falta voluntarioId = crear asignación para esta colonia, eligiendo voluntario.
	// Falta coloniaId = crear asignación para este voluntario, eligiendo colonia.
	AsignacionForm: { voluntarioId?: string; coloniaId?: string };
};

// NavigatorScreenParams (no "undefined" a secas) es lo que permite navegar entre pestañas a una
// pantalla concreta de otro stack, p.ej. navigation.navigate("GatosTab", { screen: "GatoDetail",
// params: { id } }) desde dentro de la pestaña de Colonias.
export type MainTabParamList = {
	ColoniasTab: NavigatorScreenParams<ColoniasStackParamList>;
	GatosTab: NavigatorScreenParams<GatosStackParamList>;
	ComederosTab: NavigatorScreenParams<ComederosStackParamList>;
	VoluntariosTab: NavigatorScreenParams<VoluntariosStackParamList>;
};

export type RootStackParamList = {
	Login: undefined;
	Main: undefined;
};

export type ColoniasStackScreenProps<T extends keyof ColoniasStackParamList> = CompositeScreenProps<
	NativeStackScreenProps<ColoniasStackParamList, T>,
	BottomTabScreenProps<MainTabParamList>
>;

export type GatosStackScreenProps<T extends keyof GatosStackParamList> = CompositeScreenProps<
	NativeStackScreenProps<GatosStackParamList, T>,
	BottomTabScreenProps<MainTabParamList>
>;

export type ComederosStackScreenProps<T extends keyof ComederosStackParamList> = CompositeScreenProps<
	NativeStackScreenProps<ComederosStackParamList, T>,
	BottomTabScreenProps<MainTabParamList>
>;

export type VoluntariosStackScreenProps<T extends keyof VoluntariosStackParamList> = CompositeScreenProps<
	NativeStackScreenProps<VoluntariosStackParamList, T>,
	BottomTabScreenProps<MainTabParamList>
>;
