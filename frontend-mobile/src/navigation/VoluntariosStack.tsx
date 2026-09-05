import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { VoluntariosListScreen } from "../screens/VoluntariosListScreen";
import { VoluntarioDetailScreen } from "../screens/VoluntarioDetailScreen";
import { VoluntarioFormScreen } from "../screens/VoluntarioFormScreen";
import { AsignacionFormScreen } from "../screens/AsignacionFormScreen";
import type { VoluntariosStackParamList } from "./types";

const Stack = createNativeStackNavigator<VoluntariosStackParamList>();

export function VoluntariosStack() {
	return (
		<Stack.Navigator screenOptions={{ headerShown: false }}>
			<Stack.Screen name="VoluntariosList" component={VoluntariosListScreen} />
			<Stack.Screen name="VoluntarioDetail" component={VoluntarioDetailScreen} />
			<Stack.Screen name="VoluntarioForm" component={VoluntarioFormScreen} options={{ presentation: "modal" }} />
			<Stack.Screen name="AsignacionForm" component={AsignacionFormScreen} options={{ presentation: "modal" }} />
		</Stack.Navigator>
	);
}
