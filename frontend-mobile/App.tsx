import { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ApolloProvider } from "@apollo/client/react";
import { client } from "./src/graphql/apolloClient";
import { iniciarColaOffline } from "./src/graphql/offlineQueue";
import { AuthProvider } from "./src/features/auth/AuthContext";
import { AppNavigator } from "./src/navigation/AppNavigator";

export default function App() {
	// Vacía la cola de mutaciones offline (visitas/intervenciones que no se pudieron enviar por
	// falta de conexión) al abrir la app y cada vez que se recupera la red - ver offlineQueue.ts.
	useEffect(() => iniciarColaOffline(client), []);

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
