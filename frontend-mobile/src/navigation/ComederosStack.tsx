import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ComederosListScreen } from "../screens/ComederosListScreen";
import { ComederoDetailScreen } from "../screens/ComederoDetailScreen";
import { ComederoFormScreen } from "../screens/ComederoFormScreen";
import type { ComederosStackParamList } from "./types";

const Stack = createNativeStackNavigator<ComederosStackParamList>();

export function ComederosStack() {
	return (
		<Stack.Navigator screenOptions={{ headerShown: false }}>
			<Stack.Screen name="ComederosList" component={ComederosListScreen} />
			<Stack.Screen name="ComederoDetail" component={ComederoDetailScreen} />
			<Stack.Screen name="ComederoForm" component={ComederoFormScreen} options={{ presentation: "modal" }} />
		</Stack.Navigator>
	);
}
