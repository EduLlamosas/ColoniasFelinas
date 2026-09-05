import { ActivityIndicator, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuth } from "../features/auth/useAuth";
import { LoginScreen } from "../screens/LoginScreen";
import { MainTabs } from "./MainTabs";
import type { RootStackParamList } from "./types";

const Stack = createNativeStackNavigator<RootStackParamList>();

export function AppNavigator() {
	const { isAuthenticated, initializing } = useAuth();

	if (initializing) {
		return (
			<View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
				<ActivityIndicator size="large" />
			</View>
		);
	}

	return (
		<NavigationContainer>
			<Stack.Navigator screenOptions={{ headerShown: false }}>
				{isAuthenticated ? (
					<Stack.Screen name="Main" component={MainTabs} />
				) : (
					<Stack.Screen name="Login" component={LoginScreen} />
				)}
			</Stack.Navigator>
		</NavigationContainer>
	);
}
