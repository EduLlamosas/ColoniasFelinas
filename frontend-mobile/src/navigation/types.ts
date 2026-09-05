import type { CompositeScreenProps, NavigatorScreenParams } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";

export type ColoniasStackParamList = {
	ColoniasList: undefined;
	ColoniaDetail: { id: string };
	ColoniaForm: { id?: string } | undefined;
};

export type GatosStackParamList = {
	GatosList: undefined;
	GatoDetail: { id: string };
	GatoForm: { id?: string; defaultColoniaId?: string } | undefined;
};

export type ComederosStackParamList = {
	ComederosList: undefined;
	ComederoDetail: { id: string };
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
