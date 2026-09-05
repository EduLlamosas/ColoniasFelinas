import { useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useAuth } from "../features/auth/useAuth";
import { getErrorMessage } from "../lib/graphqlErrors";

export function LoginScreen() {
	const { login } = useAuth();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);

	async function handleSubmit() {
		setError(null);
		setSubmitting(true);
		try {
			await login(email, password);
		} catch (err) {
			setError(getErrorMessage(err));
		} finally {
			setSubmitting(false);
		}
	}

	return (
		<View style={styles.container}>
			<View style={styles.card}>
				<Text style={styles.title}>Colonias Felinas</Text>
				<Text style={styles.subtitle}>Panel de gestión municipal</Text>

				<Text style={styles.label}>Correo electrónico</Text>
				<TextInput
					style={styles.input}
					autoCapitalize="none"
					autoComplete="username"
					keyboardType="email-address"
					value={email}
					onChangeText={setEmail}
				/>

				<Text style={styles.label}>Contraseña</Text>
				<TextInput
					style={styles.input}
					secureTextEntry
					autoComplete="current-password"
					value={password}
					onChangeText={setPassword}
				/>

				{error && <Text style={styles.error}>{error}</Text>}

				<TouchableOpacity
					style={[styles.button, submitting && styles.buttonDisabled]}
					onPress={handleSubmit}
					disabled={submitting}
				>
					{submitting ? (
						<ActivityIndicator color="#fff" />
					) : (
						<Text style={styles.buttonText}>Iniciar sesión</Text>
					)}
				</TouchableOpacity>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		backgroundColor: "#f8fafc",
		padding: 16,
	},
	card: {
		width: "100%",
		maxWidth: 360,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: "#e2e8f0",
		backgroundColor: "#fff",
		padding: 24,
	},
	title: {
		fontSize: 18,
		fontWeight: "600",
		color: "#0f172a",
		textAlign: "center",
	},
	subtitle: {
		fontSize: 14,
		color: "#64748b",
		textAlign: "center",
		marginTop: 4,
		marginBottom: 24,
	},
	label: {
		fontSize: 14,
		color: "#334155",
		marginBottom: 4,
	},
	input: {
		borderWidth: 1,
		borderColor: "#cbd5e1",
		borderRadius: 8,
		paddingHorizontal: 12,
		paddingVertical: 10,
		marginBottom: 16,
		fontSize: 15,
	},
	error: {
		color: "#dc2626",
		fontSize: 13,
		marginBottom: 12,
	},
	button: {
		backgroundColor: "#0f172a",
		borderRadius: 8,
		paddingVertical: 12,
		alignItems: "center",
	},
	buttonDisabled: {
		opacity: 0.6,
	},
	buttonText: {
		color: "#fff",
		fontWeight: "600",
		fontSize: 15,
	},
});
