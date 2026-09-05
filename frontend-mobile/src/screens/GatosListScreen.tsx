import { useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Image, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useQuery } from "@apollo/client/react";
import { GATOS_QUERY } from "../features/gatos/gatos.graphql";
import { COLONIAS_QUERY } from "../features/colonias/colonias.graphql";
import { getErrorMessage } from "../lib/graphqlErrors";
import { resolveMediaUrl } from "../lib/config";
import { ESTADO_CER_LABELS, SEXO_LABELS } from "../lib/enums";
import { ScreenHeader } from "../components/ScreenHeader";
import type { Colonia, Gato } from "../types/graphql";
import type { GatosStackScreenProps } from "../navigation/types";

type Props = GatosStackScreenProps<"GatosList">;

export function GatosListScreen({ navigation }: Props) {
	const { data, loading, error, refetch } = useQuery<{ gatos: Gato[] }>(GATOS_QUERY);
	const { data: coloniasData } = useQuery<{ colonias: Colonia[] }>(COLONIAS_QUERY);
	const colonias = coloniasData?.colonias ?? [];
	const coloniasById = useMemo(() => new Map(colonias.map((c) => [c.id, c])), [colonias]);
	const [coloniaFilter, setColoniaFilter] = useState<string | null>(null);

	const gatos = useMemo(() => {
		const all = data?.gatos ?? [];
		return coloniaFilter ? all.filter((g) => g.coloniaId === Number(coloniaFilter)) : all;
	}, [data, coloniaFilter]);

	return (
		<View style={styles.container}>
			<ScreenHeader title="Gatos" subtitle="Censo individualizado" />

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

			{!error && data && gatos.length === 0 && (
				<View style={styles.centered}>
					<Text style={styles.emptyText}>No hay gatos que mostrar.</Text>
				</View>
			)}

			<FlatList
				data={gatos}
				keyExtractor={(item) => item.id}
				refreshControl={<RefreshControl refreshing={loading && !!data} onRefresh={() => refetch()} />}
				contentContainerStyle={gatos.length === 0 ? undefined : styles.listContent}
				renderItem={({ item }) => (
					<TouchableOpacity style={styles.row} onPress={() => navigation.navigate("GatoDetail", { id: item.id })}>
						{item.fotoUrl ? (
							<Image source={{ uri: resolveMediaUrl(item.fotoUrl)! }} style={styles.thumb} />
						) : (
							<View style={styles.thumbPlaceholder} />
						)}
						<View style={styles.rowInfo}>
							<Text style={styles.rowTitle}>{item.nombre ?? "Sin nombre"}</Text>
							<Text style={styles.rowSubtitle}>
								{coloniasById.get(String(item.coloniaId))?.nombre ?? "—"} · {SEXO_LABELS[item.sexo]}
							</Text>
						</View>
						<Text style={styles.badge}>{ESTADO_CER_LABELS[item.estadoCer]}</Text>
					</TouchableOpacity>
				)}
			/>

			<TouchableOpacity style={styles.fab} onPress={() => navigation.navigate("GatoForm", undefined)}>
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
	badge: { fontSize: 11, fontWeight: "600", color: "#0f766e" },
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
