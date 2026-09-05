import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useAuth } from "../features/auth/useAuth";

interface ScreenHeaderProps {
	title: string;
	subtitle?: string;
}

export function ScreenHeader({ title, subtitle }: ScreenHeaderProps) {
	const { logout } = useAuth();

	return (
		<View style={styles.header}>
			<View>
				<Text style={styles.headerTitle}>{title}</Text>
				{subtitle && <Text style={styles.headerSubtitle}>{subtitle}</Text>}
			</View>
			<TouchableOpacity onPress={logout}>
				<Text style={styles.logout}>Salir</Text>
			</TouchableOpacity>
		</View>
	);
}

const styles = StyleSheet.create({
	header: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		paddingHorizontal: 16,
		paddingTop: 56,
		paddingBottom: 16,
		backgroundColor: "#fff",
		borderBottomWidth: 1,
		borderBottomColor: "#e2e8f0",
	},
	headerTitle: { fontSize: 20, fontWeight: "700", color: "#0f172a" },
	headerSubtitle: { fontSize: 13, color: "#64748b", marginTop: 2 },
	logout: { color: "#dc2626", fontWeight: "600", fontSize: 14 },
});
