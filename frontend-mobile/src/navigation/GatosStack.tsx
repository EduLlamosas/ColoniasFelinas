import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { GatosListScreen } from "../screens/GatosListScreen";
import { GatoDetailScreen } from "../screens/GatoDetailScreen";
import { GatoFormScreen } from "../screens/GatoFormScreen";
import type { GatosStackParamList } from "./types";

const Stack = createNativeStackNavigator<GatosStackParamList>();

export function GatosStack() {
	return (
		<Stack.Navigator screenOptions={{ headerShown: false }}>
			<Stack.Screen name="GatosList" component={GatosListScreen} />
			<Stack.Screen name="GatoDetail" component={GatoDetailScreen} />
			<Stack.Screen name="GatoForm" component={GatoFormScreen} options={{ presentation: "modal" }} />
		</Stack.Navigator>
	);
}
