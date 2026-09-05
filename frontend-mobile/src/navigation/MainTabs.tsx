import { Text } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { ColoniasStack } from "./ColoniasStack";
import { GatosStack } from "./GatosStack";
import { ComederosStack } from "./ComederosStack";
import { VoluntariosStack } from "./VoluntariosStack";
import type { MainTabParamList } from "./types";

const Tab = createBottomTabNavigator<MainTabParamList>();

export function MainTabs() {
	return (
		<Tab.Navigator screenOptions={{ headerShown: false }}>
			<Tab.Screen
				name="ColoniasTab"
				component={ColoniasStack}
				options={{ title: "Colonias", tabBarIcon: ({ size }) => <Text style={{ fontSize: size }}>🏠</Text> }}
			/>
			<Tab.Screen
				name="GatosTab"
				component={GatosStack}
				options={{ title: "Gatos", tabBarIcon: ({ size }) => <Text style={{ fontSize: size }}>🐱</Text> }}
			/>
			<Tab.Screen
				name="ComederosTab"
				component={ComederosStack}
				options={{ title: "Comederos", tabBarIcon: ({ size }) => <Text style={{ fontSize: size }}>🍽️</Text> }}
			/>
			<Tab.Screen
				name="VoluntariosTab"
				component={VoluntariosStack}
				options={{ title: "Voluntarios", tabBarIcon: ({ size }) => <Text style={{ fontSize: size }}>🙋</Text> }}
			/>
		</Tab.Navigator>
	);
}
