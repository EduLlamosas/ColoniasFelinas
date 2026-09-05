import { useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Image, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useQuery } from "@apollo/client/react";
import { COMEDEROS_QUERY } from "../features/comederos/comederos.graphql";
import { COLONIAS_QUERY } from "../features/colonias/colonias.graphql";
import { getErrorMessage } from "../lib/graphqlErrors";
import { resolveMediaUrl } from "../lib/config";
import { ScreenHeader } from "../components/ScreenHeader";
import type { Colonia, Comedero } from "../types/graphql";
import type { ComederosStackScreenProps } from "../navigation/types";

type Props = ComederosStackScreenProps<"ComederosList">;

export function ComederosListScreen({ navigation }: Props) {
	const { data, loading, error, refetch } = useQuery<{ comederos: Comedero[] }>(COMEDEROS_QUERY);
	const { data: coloniasData } = useQuery<{ colonias: Colonia[] }>(COLONIAS_QUERY);
	const colonias = coloniasData?.colonias ?? [];
	const coloniasById = useMemo(() => new Map(colonias.map((c) => [c.id, c])), [colonias]);
	const [coloniaFilter, setColoniaFilter] = useState<string | null>(null);

	const comederos = useMemo(() => {
		const all = data?.comederos ?? [];
		return coloniaFilter ? all.filter((c) => c.coloniaId === Number(coloniaFilter)) : all;
	}, [data, coloniaFilter]);

	return (
		<View style={styles.container}>
			<ScreenHeader title="Comederos" subtitle="Puntos de alimentación" />

			<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
				<TouchableOpacity
					style={[styles.chip, coloniaFilter === null && styles.chipSelected]}
					onPress={() => setColoniaFilter(null)}
				>
					<Text style={[styles.chipText, coloniaFilter === null && styles.chipTextSelected]}>Todas</Text>
				</TouchableOpacity>
				{colonias.map((colonia) => (
					<TouchableOpacity
						key={colonia.id}
						style={[styles.chip, coloniaFilter === colonia.id && styles.chipSelected]}
						onPress={() => setColoniaFilter(colonia.id)}
					>
						<Text style={[styles.chipText, coloniaFilter === colonia.id && styles.chipTextSelected]}>
							{colonia.nombre}
						</Text>
					</TouchableOpacity>
				))}
			</ScrollView>

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

			{!error && data && comederos.length === 0 && (
				<View style={styles.centered}>
					<Text style={styles.emptyText}>No hay comederos que mostrar.</Text>
				</View>
			)}

			<FlatList
				data={comederos}
				keyExtractor={(item) => item.id}
				refreshControl={<RefreshControl refreshing={loading && !!data} onRefresh={() => refetch()} />}
				contentContainerStyle={comederos.length === 0 ? undefined : styles.listContent}
				renderItem={({ item }) => (
					<TouchableOpacity style={styles.row} onPress={() => navigation.navigate("ComederoDetail", { id: item.id })}>
						{item.fotoUrl ? (
							<Image source={{ uri: resolveMediaUrl(item.fotoUrl)! }} style={styles.thumb} />
						) : (
							<View style={styles.thumbPlaceholder} />
						)}
						<View style={styles.rowInfo}>
							<Text style={styles.rowTitle}>{item.ubicacionDetallada}</Text>
							<Text style={styles.rowSubtitle}>{coloniasById.get(String(item.coloniaId))?.nombre ?? "—"}</Text>
						</View>
					</TouchableOpacity>
				)}
			/>

			<TouchableOpacity style={styles.fab} onPress={() => navigation.navigate("ComederoForm", undefined)}>
				<Text style={styles.fabText}>+</Text>
			</TouchableOpacity>
		</View>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: "#f8fafc" },
	filterRow: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
	chip: {
		borderWidth: 1,
		borderColor: "#cbd5e1",
		borderRadius: 999,
		paddingHorizontal: 14,
		paddingVertical: 8,
		backgroundColor: "#fff",
		marginRight: 8,
	},
	chipSelected: { backgroundColor: "#0f172a", borderColor: "#0f172a" },
	chipText: { fontSize: 13, color: "#334155", fontWeight: "500" },
	chipTextSelected: { color: "#fff" },
	centered: { paddingVertical: 40, alignItems: "center" },
	error: { color: "#dc2626", textAlign: "center", paddingHorizontal: 24 },
	emptyText: { color: "#64748b", textAlign: "center", paddingHorizontal: 24 },
	listContent: { paddingBottom: 24 },
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
