import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ApolloProvider } from "@apollo/client/react";
import { client } from "./src/graphql/apolloClient";
import { AuthProvider } from "./src/features/auth/AuthContext";
import { AppNavigator } from "./src/navigation/AppNavigator";

export default function App() {
	return (
		<SafeAreaProvider>
			<ApolloProvider client={client}>
				<AuthProvider>
					<AppNavigator />
					<StatusBar style="auto" />
				</AuthProvider>
			</ApolloProvider>
		</SafeAreaProvider>
	);
}
