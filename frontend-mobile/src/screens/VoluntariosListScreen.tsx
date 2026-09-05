import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useQuery } from "@apollo/client/react";
import { VOLUNTARIOS_QUERY } from "../features/voluntarios/voluntarios.graphql";
import { getErrorMessage } from "../lib/graphqlErrors";
import { ScreenHeader } from "../components/ScreenHeader";
import type { Voluntario } from "../types/graphql";
import type { VoluntariosStackScreenProps } from "../navigation/types";

type Props = VoluntariosStackScreenProps<"VoluntariosList">;

export function VoluntariosListScreen({ navigation }: Props) {
	const { data, loading, error, refetch } = useQuery<{ voluntarios: Voluntario[] }>(VOLUNTARIOS_QUERY);
	const voluntarios = data?.voluntarios ?? [];

	return (
		<View style={styles.container}>
			<ScreenHeader title="Voluntarios" subtitle="Colaboradores registrados" />

			{loading && !data && (
				<View style={styles.centered}>
					<ActivityIndicator size="large" />
				</View>
			)}

			{error && (
				<View style={styles.centered}>
					<Text style={styles.error}>{getErrorMessage(error)}</Text>
				</View>
			)}

			{!error && data && voluntarios.length === 0 && (
				<View style={styles.centered}>
					<Text style={styles.emptyText}>Todavía no hay voluntarios registrados.</Text>
				</View>
			)}

			<FlatList
				data={voluntarios}
				keyExtractor={(item) => item.id}
				refreshControl={<RefreshControl refreshing={loading && !!data} onRefresh={() => refetch()} />}
				contentContainerStyle={voluntarios.length === 0 ? undefined : styles.listContent}
				renderItem={({ item }) => (
					<TouchableOpacity
						style={styles.row}
						onPress={() => navigation.navigate("VoluntarioDetail", { id: item.id })}
					>
						<View style={styles.rowInfo}>
							<Text style={styles.rowTitle}>{item.nombre}</Text>
							<Text style={styles.rowSubtitle}>{item.dni}</Text>
						</View>
						<Text style={item.urlCesionDatos ? styles.badgeOk : styles.badgeMissing}>
							{item.urlCesionDatos ? "RGPD ✓" : "Falta RGPD"}
						</Text>
					</TouchableOpacity>
				)}
			/>

			<TouchableOpacity style={styles.fab} onPress={() => navigation.navigate("VoluntarioForm", undefined)}>
				<Text style={styles.fabText}>+</Text>
			</TouchableOpacity>
		</View>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: "#f8fafc" },
	centered: { paddingVertical: 40, alignItems: "center" },
	error: { color: "#dc2626", textAlign: "center", paddingHorizontal: 24 },
	emptyText: { color: "#64748b", textAlign: "center", paddingHorizontal: 24 },
	listContent: { paddingBottom: 24 },
	row: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingHorizontal: 16,
		paddingVertical: 14,
		backgroundColor: "#fff",
		borderBottomWidth: 1,
		borderBottomColor: "#e2e8f0",
	},
	rowInfo: { flex: 1 },
	rowTitle: { fontSize: 15, fontWeight: "600", color: "#0f172a" },
	rowSubtitle: { fontSize: 13, color: "#64748b", marginTop: 2 },
	badgeOk: { fontSize: 11, fontWeight: "600", color: "#0f766e" },
	badgeMissing: { fontSize: 11, fontWeight: "600", color: "#dc2626" },
	fab: {
		position: "absolute",
		right: 20,
		bottom: 28,
		width: 56,
		height: 56,
		borderRadius: 28,
		backgroundColor: "#0f172a",
		justifyContent: "center",
		alignItems: "center",
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.25,
		shadowRadius: 4,
		elevation: 4,
	},
	fabText: { color: "#fff", fontSize: 28, lineHeight: 30, fontWeight: "400" },
});
