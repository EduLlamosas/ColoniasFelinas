import { useState } from "react";
import { ActivityIndicator, FlatList, Image, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useQuery } from "@apollo/client/react";
import { COLONIAS_QUERY } from "../features/colonias/colonias.graphql";
import { useAuth } from "../features/auth/useAuth";
import { getErrorMessage } from "../lib/graphqlErrors";
import { resolveMediaUrl } from "../lib/config";
import { TIPO_SUELO_LABELS } from "../lib/enums";
import { ColoniasMap } from "../components/ColoniasMap";
import { ScreenHeader } from "../components/ScreenHeader";
import type { Colonia } from "../types/graphql";
import type { ColoniasStackScreenProps } from "../navigation/types";

type Props = ColoniasStackScreenProps<"ColoniasList">;
type View_ = "tabla" | "mapa";

export function ColoniasListScreen({ navigation }: Props) {
	const { user } = useAuth();
	const { data, loading, error, refetch } = useQuery<{ colonias: Colonia[] }>(COLONIAS_QUERY);
	const colonias = data?.colonias ?? [];
	const [view, setView] = useState<View_>("tabla");

	return (
		<View style={styles.container}>
			<ScreenHeader title="Colonias" subtitle={`Hola, ${user?.nombreCompleto}`} />

			<View style={styles.viewToggle}>
				<TouchableOpacity
					style={[styles.viewToggleButton, view === "tabla" && styles.viewToggleButtonActive]}
					onPress={() => setView("tabla")}
				>
					<Text style={[styles.viewToggleText, view === "tabla" && styles.viewToggleTextActive]}>Tabla</Text>
				</TouchableOpacity>
				<TouchableOpacity
					style={[styles.viewToggleButton, view === "mapa" && styles.viewToggleButtonActive]}
					onPress={() => setView("mapa")}
				>
					<Text style={[styles.viewToggleText, view === "mapa" && styles.viewToggleTextActive]}>Mapa</Text>
				</TouchableOpacity>
			</View>

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

			{!error && data && colonias.length === 0 && (
				<View style={styles.centered}>
					<Text style={styles.emptyText}>Todavía no hay colonias censadas.</Text>
				</View>
			)}

			{!error && colonias.length > 0 && view === "mapa" && (
				<View style={styles.mapWrapper}>
					<ColoniasMap colonias={colonias} onSelect={(id) => navigation.navigate("ColoniaDetail", { id })} />
				</View>
			)}

			{view === "tabla" && (
				<FlatList
					data={colonias}
					keyExtractor={(item) => item.id}
					refreshControl={<RefreshControl refreshing={loading && !!data} onRefresh={() => refetch()} />}
					contentContainerStyle={colonias.length === 0 ? undefined : styles.listContent}
					renderItem={({ item }) => (
						<TouchableOpacity
							style={styles.row}
							onPress={() => navigation.navigate("ColoniaDetail", { id: item.id })}
						>
							{item.fotoUrl ? (
								<Image source={{ uri: resolveMediaUrl(item.fotoUrl)! }} style={styles.thumb} />
							) : (
								<View style={styles.thumbPlaceholder} />
							)}
							<View style={styles.rowInfo}>
								<Text style={styles.rowTitle}>{item.nombre}</Text>
								<Text style={styles.rowSubtitle}>
									{item.codigoOficial} · {TIPO_SUELO_LABELS[item.tipoSuelo]}
								</Text>
							</View>
						</TouchableOpacity>
					)}
				/>
			)}

			<TouchableOpacity style={styles.fab} onPress={() => navigation.navigate("ColoniaForm", undefined)}>
				<Text style={styles.fabText}>+</Text>
			</TouchableOpacity>
		</View>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: "#f8fafc" },
	viewToggle: {
		flexDirection: "row",
		margin: 16,
		marginBottom: 8,
		borderWidth: 1,
		borderColor: "#cbd5e1",
		borderRadius: 8,
		overflow: "hidden",
		alignSelf: "flex-start",
	},
	viewToggleButton: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: "#fff" },
	viewToggleButtonActive: { backgroundColor: "#0f172a" },
	viewToggleText: { fontSize: 13, fontWeight: "600", color: "#334155" },
	viewToggleTextActive: { color: "#fff" },
	centered: { paddingVertical: 40, alignItems: "center" },
	error: { color: "#dc2626", textAlign: "center", paddingHorizontal: 24 },
	emptyText: { color: "#64748b", textAlign: "center", paddingHorizontal: 24 },
	listContent: { paddingBottom: 24 },
	mapWrapper: { flex: 1, marginHorizontal: 16, marginBottom: 16 },
	row: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 16,
		paddingVertical: 12,
		backgroundColor: "#fff",
		borderBottomWidth: 1,
		borderBottomColor: "#e2e8f0",
	},
	thumb: { width: 44, height: 44, borderRadius: 8, backgroundColor: "#e2e8f0" },
	thumbPlaceholder: { width: 44, height: 44, borderRadius: 8, backgroundColor: "#e2e8f0" },
	rowInfo: { marginLeft: 12, flex: 1 },
	rowTitle: { fontSize: 15, fontWeight: "600", color: "#0f172a" },
	rowSubtitle: { fontSize: 13, color: "#64748b", marginTop: 2 },
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
