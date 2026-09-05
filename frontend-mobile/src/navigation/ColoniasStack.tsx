import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ColoniasListScreen } from "../screens/ColoniasListScreen";
import { ColoniaDetailScreen } from "../screens/ColoniaDetailScreen";
import { ColoniaFormScreen } from "../screens/ColoniaFormScreen";
import type { ColoniasStackParamList } from "./types";

const Stack = createNativeStackNavigator<ColoniasStackParamList>();

export function ColoniasStack() {
	return (
		<Stack.Navigator screenOptions={{ headerShown: false }}>
			<Stack.Screen name="ColoniasList" component={ColoniasListScreen} />
			<Stack.Screen name="ColoniaDetail" component={ColoniaDetailScreen} />
			<Stack.Screen name="ColoniaForm" component={ColoniaFormScreen} options={{ presentation: "modal" }} />
		</Stack.Navigator>
	);
}
